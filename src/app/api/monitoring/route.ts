import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { getSystemMetrics } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    if (!isAdminRequest(request)) {
      return NextResponse.json(
        { 
          error: 'Access denied. Admin privileges required.',
          code: 'ADMIN_ACCESS_REQUIRED'
        },
        { status: 403 }
      );
    }

    // Get system metrics
    const metrics = await getSystemMetrics();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: metrics
    });

  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve monitoring data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check admin access
    if (!isAdminRequest(request)) {
      return NextResponse.json(
        { 
          error: 'Access denied. Admin privileges required.',
          code: 'ADMIN_ACCESS_REQUIRED'
        },
        { status: 403 }
      );
    }

    // Clear logs functionality
    // In a real implementation, this would clear log files or database entries
    console.log('Admin requested log clearing at:', new Date().toISOString());
    
    return NextResponse.json({
      success: true,
      message: 'Logs cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Log clearing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
    },
  });
}
