// Export Integration Module for Job Application Tracker
// Handles data export to external job tracking platforms

class ExportIntegration {
  constructor() {
    this.totalJobTrackerUrl = 'https://total-job-tracker.vercel.app';
    this.supportedFormats = ['json', 'csv'];
    this.exportStatus = 'idle'; // idle, exporting, success, error
  }

  // Export all applications to total-job-tracker.vercel.app
  async exportToTotalJobTracker() {
    try {
      this.exportStatus = 'exporting';
      this.updateUI('正在准备导出数据...');
      
      const applications = await this.getAllApplications();
      if (!applications || applications.length === 0) {
        throw new Error('没有找到可导出的工作申请数据');
      }

      const exportData = this.formatForTotalJobTracker(applications);
      
      this.updateUI(`正在导出 ${applications.length} 条工作申请数据...`);
      
      // Try to send to total-job-tracker API
      const success = await this.sendToTotalJobTracker(exportData);
      
      if (success) {
        this.exportStatus = 'success';
        this.updateUI('✅ 数据导出成功！已发送到 Total Job Tracker');
        this.showSuccessMessage(applications.length);
      } else {
        // Fallback to download
        this.downloadAsFile(exportData, 'total-job-tracker-import.json');
        this.exportStatus = 'success';
        this.updateUI('✅ 数据已准备完成！请下载文件并手动导入到 Total Job Tracker');
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      this.exportStatus = 'error';
      this.updateUI(`❌ 导出失败: ${error.message}`);
    }
  }

  // Get all applications from Chrome storage
  async getAllApplications() {
    return new Promise((resolve) => {
      chrome.storage.local.get('applications', ({ applications = [] }) => {
        resolve(applications);
      });
    });
  }

  // Format data for Total Job Tracker platform
  formatForTotalJobTracker(applications) {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        source: 'Chrome Extension - Job Application Tracker',
        version: '1.0.0',
        totalRecords: applications.length
      },
      applications: applications.map(app => ({
        // Standard fields
        id: app.id || this.generateId(),
        company: app.company || 'Unknown Company',
        position: app.position || app.role || 'Unknown Position',
        status: this.normalizeStatus(app.status),
        applicationDate: app.applicationDate || new Date().toISOString(),
        
        // Platform information
        platform: app.platform || 'other',
        source: 'gmail',
        
        // Contact and email information
        emailId: app.emailId,
        emailSubject: app.emailSubject,
        emailDate: app.emailDate,
        emailFrom: app.from,
        
        // Additional metadata
        snippet: app.snippet,
        statusHistory: app.statusHistory || [
          {
            status: app.status || 'applied',
            at: app.applicationDate || new Date().toISOString(),
            note: 'Imported from Gmail via Chrome Extension'
          }
        ],
        
        // Links
        gmailLink: app.emailId ? `https://mail.google.com/mail/u/0/#inbox/${app.emailId}` : null,
        
        // Import metadata
        importedAt: new Date().toISOString(),
        importSource: 'chrome-extension'
      }))
    };

    return exportData;
  }

  // Normalize status for external platform compatibility
  normalizeStatus(status) {
    const statusMap = {
      'applied': 'applied',
      'viewed': 'reviewed',
      'interview': 'interview',
      'offer': 'offer', 
      'rejected': 'rejected',
      'ghost': 'ghosted'
    };
    
    return statusMap[status?.toLowerCase()] || 'applied';
  }

  // Attempt to send data to Total Job Tracker API
  async sendToTotalJobTracker(exportData) {
    try {
      // Try the API endpoint (this might need authentication)
      const response = await fetch(`${this.totalJobTrackerUrl}/api/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'chrome-extension'
        },
        body: JSON.stringify(exportData)
      });

      if (response.ok) {
        return true;
      } else {
        console.log('API not available, falling back to file download');
        return false;
      }
    } catch (error) {
      console.log('API call failed, falling back to file download:', error);
      return false;
    }
  }

  // Download data as file for manual import
  downloadAsFile(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export as CSV format
  async exportAsCSV() {
    try {
      this.exportStatus = 'exporting';
      this.updateUI('正在生成 CSV 文件...');
      
      const applications = await this.getAllApplications();
      const csvData = this.formatAsCSV(applications);
      
      this.downloadAsFile(csvData, 'job-applications-export.csv', 'text/csv');
      
      this.exportStatus = 'success';
      this.updateUI('✅ CSV 文件导出成功！');
    } catch (error) {
      console.error('CSV export failed:', error);
      this.exportStatus = 'error';
      this.updateUI(`❌ CSV 导出失败: ${error.message}`);
    }
  }

  // Format data as CSV
  formatAsCSV(applications) {
    const headers = [
      'Company', 'Position', 'Status', 'Application Date', 'Platform',
      'Email Subject', 'Gmail Link', 'Last Updated'
    ];

    const rows = applications.map(app => [
      this.escapeCSV(app.company || ''),
      this.escapeCSV(app.position || app.role || ''),
      app.status || 'applied',
      app.applicationDate || '',
      app.platform || 'other',
      this.escapeCSV(app.emailSubject || ''),
      app.emailId ? `https://mail.google.com/mail/u/0/#inbox/${app.emailId}` : '',
      app.statusHistory?.length ? app.statusHistory[app.statusHistory.length - 1].at : app.applicationDate || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  escapeCSV(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // Generate unique ID
  generateId() {
    return 'export-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
  }

  // Update UI with status message
  updateUI(message) {
    const statusEl = document.getElementById('exportStatus');
    if (statusEl) {
      statusEl.textContent = message;
    }
    console.log('Export Status:', message);
  }

  // Show success message with details
  showSuccessMessage(count) {
    const message = `
      🎉 导出成功完成！
      
      ✅ 已导出 ${count} 条工作申请记录
      📊 数据已发送到 Total Job Tracker
      🔗 请访问 ${this.totalJobTrackerUrl}/dashboard 查看导入的数据
      
      如果数据未显示，请刷新页面或联系平台支持。
    `;
    
    alert(message);
  }

  // Initialize integration buttons and event listeners
  initializeIntegration() {
    // Add export buttons to dashboard
    this.addExportButtons();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  addExportButtons() {
    const dashboardControls = document.querySelector('.dashboard-controls') || document.querySelector('#sync')?.parentElement;
    
    if (dashboardControls) {
      const exportContainer = document.createElement('div');
      exportContainer.className = 'export-container';
      exportContainer.style.cssText = 'margin: 10px 0; display: flex; gap: 10px; flex-wrap: wrap;';
      
      exportContainer.innerHTML = `
        <button id="exportToTotalJobTracker" class="export-btn" style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          border: none; 
          padding: 8px 16px; 
          border-radius: 6px; 
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: transform 0.2s;
        ">
          🚀 导出到 Total Job Tracker
        </button>
        
        <button id="exportAsCSV" class="export-btn" style="
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white; 
          border: none; 
          padding: 8px 16px; 
          border-radius: 6px; 
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: transform 0.2s;
        ">
          📄 导出 CSV
        </button>
        
        <button id="openTotalJobTracker" class="export-btn" style="
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white; 
          border: none; 
          padding: 8px 16px; 
          border-radius: 6px; 
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: transform 0.2s;
        ">
          🌐 打开 Total Job Tracker
        </button>
        
        <div id="exportStatus" style="
          flex: 1; 
          padding: 8px 12px; 
          font-size: 14px; 
          color: #666;
          display: flex;
          align-items: center;
        "></div>
      `;
      
      dashboardControls.appendChild(exportContainer);
      
      // Add hover effects
      const buttons = exportContainer.querySelectorAll('.export-btn');
      buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
          btn.style.transform = 'translateY(-2px)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'translateY(0)';
        });
      });
    }
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'exportToTotalJobTracker') {
        e.preventDefault();
        this.exportToTotalJobTracker();
      } else if (e.target.id === 'exportAsCSV') {
        e.preventDefault();
        this.exportAsCSV();
      } else if (e.target.id === 'openTotalJobTracker') {
        e.preventDefault();
        chrome.tabs.create({ url: `${this.totalJobTrackerUrl}/dashboard` });
      }
    });
  }

  // Get export statistics
  async getExportStats() {
    const applications = await this.getAllApplications();
    
    const stats = {
      total: applications.length,
      byStatus: {},
      byPlatform: {},
      dateRange: null
    };

    if (applications.length > 0) {
      // Count by status
      applications.forEach(app => {
        const status = app.status || 'applied';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      });

      // Count by platform
      applications.forEach(app => {
        const platform = app.platform || 'other';
        stats.byPlatform[platform] = (stats.byPlatform[platform] || 0) + 1;
      });

      // Date range
      const dates = applications
        .map(app => new Date(app.applicationDate || 0))
        .filter(date => !isNaN(date.getTime()));
      
      if (dates.length > 0) {
        stats.dateRange = {
          earliest: new Date(Math.min(...dates)).toISOString().split('T')[0],
          latest: new Date(Math.max(...dates)).toISOString().split('T')[0]
        };
      }
    }

    return stats;
  }

  // Preview export data
  async previewExportData() {
    const applications = await this.getAllApplications();
    const exportData = this.formatForTotalJobTracker(applications);
    
    console.log('Export Preview:', exportData);
    return exportData;
  }
}

// Initialize export integration when DOM is loaded
if (!window.exportIntegration) {
  window.exportIntegration = new ExportIntegration();
  
  // Initialize when dashboard loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => window.exportIntegration.initializeIntegration(), 1000);
    });
  } else {
    setTimeout(() => window.exportIntegration.initializeIntegration(), 1000);
  }
}