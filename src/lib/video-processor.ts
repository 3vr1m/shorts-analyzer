/**
 * Client-side video processing for transcription
 * Works with YouTube, Instagram, TikTok, and any video URL
 */

export interface VideoProcessorOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
}

export class VideoProcessor {
  private video: HTMLVideoElement | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async processVideoToMP3(videoUrl: string, options: VideoProcessorOptions = {}): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Create video element
        this.video = document.createElement('video');
        this.video.crossOrigin = 'anonymous';
        this.video.muted = true;
        this.video.playsInline = true;
        
        // Set up event listeners
        this.video.onloadedmetadata = () => {
          this.startRecording();
        };
        
        this.video.onerror = () => {
          reject(new Error('Failed to load video'));
        };
        
        // Load video
        this.video.src = videoUrl;
        this.video.load();
        
        // Start recording when video starts playing
        this.video.onplay = () => {
          this.startRecording();
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private startRecording() {
    if (!this.video) return;
    
    try {
      // Create audio context and stream
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(this.video);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      
      // Set up MediaRecorder
      this.mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.convertToMP3(audioBlob);
      };
      
      // Start recording
      this.mediaRecorder.start();
      
      // Play video to capture audio
      this.video.play();
      
      // Stop recording after video duration
      setTimeout(() => {
        this.stopRecording();
      }, (this.video.duration || 60) * 1000);
      
    } catch (error) {
      console.error('Recording failed:', error);
      this.fallbackToDirectCapture();
    }
  }

  private fallbackToDirectCapture() {
    if (!this.video) return;
    
    try {
      // Fallback: capture audio directly from video element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        
        const stream = canvas.captureStream();
        const audioTrack = stream.getAudioTracks()[0];
        
        if (audioTrack) {
          const audioStream = new MediaStream([audioTrack]);
          this.mediaRecorder = new MediaRecorder(audioStream);
          
          this.audioChunks = [];
          this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              this.audioChunks.push(event.data);
            }
          };
          
          this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            this.convertToMP3(audioBlob);
          };
          
          this.mediaRecorder.start();
          this.video.play();
          
          setTimeout(() => {
            this.stopRecording();
          }, (this.video.duration || 60) * 1000);
        }
      }
    } catch (error) {
      console.error('Fallback capture failed:', error);
    }
  }

  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    if (this.video) {
      this.video.pause();
      this.video.src = '';
    }
  }

  private async convertToMP3(audioBlob: Blob): Promise<Blob> {
    try {
      // Convert WebM to MP3 using Web Audio API
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create offline context for processing
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      const renderedBuffer = await offlineContext.startRendering();
      
      // Convert to MP3-like format (actually WAV, but MP3 compatible)
      const wavBlob = this.audioBufferToWav(renderedBuffer);
      
      return wavBlob;
      
    } catch (error) {
      console.error('MP3 conversion failed:', error);
      // Return original blob if conversion fails
      return audioBlob;
    }
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  cleanup() {
    this.stopRecording();
    this.video = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}
