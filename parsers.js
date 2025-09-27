// Simple Email type: { id, from, subject, body, date }

// Prevent duplicate class declarations
if (!window.LinkedInParser) {
window.LinkedInParser = class LinkedInParser {
  canParse(email) {
    const fromEmail = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.body || '').toLowerCase();
    const isLinkedIn = fromEmail.includes('linkedin') || fromEmail.includes('@e.linkedin.com') || fromEmail.includes('@linkedin.com');
    
    // LinkedIn Easy Apply specific keywords
    const easyApplyKeywords = [
      'easy apply', 'applied via linkedin', 'application submitted', 'thank you for applying',
      'application received', 'your application', 'job application', 'position applied',
      'application confirmation', 'applied to', 'submitted application'
    ];
    
    const hasApplicationKeywords = easyApplyKeywords.some(k => 
      subject.includes(k) || body.includes(k)
    );
    
    return isLinkedIn && hasApplicationKeywords;
  }
  async parse(email) {
    const uuid = 'linkedin-' + Date.now() + '-' + Math.random().toString(36).slice(2,11);
    const company = this.extractCompany(email.body || '', email.subject || '');
    const position = this.extractPosition(email.body || '', email.subject || '');
    if (!company || !position) return null;
    
    // Determine status based on email content
    const status = this.determineStatus(email);
    
    return {
      id: uuid,
      company,
      position,
      applicationDate: email.date,
      platform: 'linkedin',
      status: status,
      emailId: email.id,
      emailSubject: email.subject,
      emailDate: email.date
    };
  }
  extractCompany(body, subject){
    // Enhanced LinkedIn-specific patterns for company extraction
    const patterns = [
      // Direct company field patterns
      /- Company:\s*([^\r\n]+)/i,
      /Company:\s*([^\r\n]+)/i,
      /Employer:\s*([^\r\n]+)/i,
      /Organization:\s*([^\r\n]+)/i,
      
      // Position-based patterns
      /at\s+([A-Z][A-Za-z\s&.,'-]+?)(?:\s+has|\.|\n|$)/,
      /position at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /job at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /role at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // Application context patterns
      /application to\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /applied to\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /applied for.*?at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // LinkedIn specific patterns
      /([A-Za-z\s&.,'-]+?)\s+at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /([A-Z][A-Za-z\s&.,'-]+)\s*-\s*([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // Thank you patterns
      /thank you for applying to\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /thank you for your interest in\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // Status update patterns
      /your application.*?at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /application.*?for.*?at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // "sent to" patterns (for applied status)
      /sent to\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /application sent to\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // "viewed by" patterns (for viewed status)
      /viewed by\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /your application.*?viewed by\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /application.*?viewed by\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // Rejection patterns
      /we have decided not to move forward at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /we are not moving forward at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /we have decided to move forward in a different direction at\s+([A-Z][A-Za-z\s&.,'-]+)/i
    ];
    
    // Try to extract company from subject and body
    for (const pattern of patterns) {
      const subjectMatch = subject.match(pattern);
      const bodyMatch = body.match(pattern);
      
      if (subjectMatch && subjectMatch[1]) {
        let company = subjectMatch[1].trim();
        // Clean up LinkedIn-specific artifacts
        company = company.replace(/\n.*$/, '').replace(/-\s*(Location|Company|Position).*/i, '');
        company = company.replace(/\s*-\s*$/, '').replace(/\s+$/, '');
        company = company.replace(/[^\w\s&.,'-]/g, '').replace(/\s+/g, ' ').trim();
        
        if (company.length > 1 && company.length < 100 && !company.toLowerCase().includes('linkedin')) {
          return company;
        }
      }
      
      if (bodyMatch && bodyMatch[1]) {
        let company = bodyMatch[1].trim();
        // Clean up LinkedIn-specific artifacts
        company = company.replace(/\n.*$/, '').replace(/-\s*(Location|Company|Position).*/i, '');
        company = company.replace(/\s*-\s*$/, '').replace(/\s+$/, '');
        company = company.replace(/[^\w\s&.,'-]/g, '').replace(/\s+/g, ' ').trim();
        
        if (company.length > 1 && company.length < 100 && !company.toLowerCase().includes('linkedin')) {
          return company;
        }
      }
    }
    
    return null;
  }
  
  determineStatus(email) {
    const content = ((email.subject || '') + ' ' + (email.body || '')).toLowerCase();
    
    // LinkedIn-specific rejection patterns
    const rejectionPatterns = [
      // "Your update from [Company]" patterns
      'your update from',
      'unfortunately, we will not be moving forward',
      'we will not be moving forward',
      'we are not moving forward',
      'we have decided not to move forward',
      'we have chosen not to move forward',
      'we have selected not to move forward',
      'we are not proceeding',
      'we are not continuing',
      'we have decided to move forward in a different direction',
      'we are moving forward with other candidates',
      'we have chosen to move forward with other candidates',
      'we have selected another candidate',
      'we have chosen another candidate',
      'we have decided to go with another candidate',
      'we have selected a different candidate',
      'not moving forward with your application',
      'not proceeding with your application',
      'not continuing with your application',
      'not advancing your application',
      'not moving forward with this position',
      'not proceeding with this role',
      'we have decided not to move forward at',
      'we have chosen not to move forward at',
      'we have selected not to move forward at',
      'we are not proceeding at',
      'we are not moving forward at',
      'we are not continuing at',
      'for this position',
      'for this role',
      'for this opportunity',
      'at this time',
      'at this moment',
      'right now',
      'we wish you the very best',
      'we wish you all the best',
      'we hope our paths might cross again',
      'we hope to cross paths again',
      'please don\'t hesitate to reach out',
      'feel free to reach out',
      'if there\'s ever anything we can do',
      'if there\'s anything we can do to support you'
    ];
    
    // Check for rejection patterns
    for (const pattern of rejectionPatterns) {
      if (content.includes(pattern)) {
        console.log(`🚫 LinkedIn rejection detected: "${pattern}"`);
        return 'rejected';
      }
    }
    
    // Check for viewed patterns
    if (content.includes('your application was viewed') || 
        content.includes('your application is viewed') ||
        content.includes('viewed your application') ||
        content.includes('viewed by')) {
      console.log(`👀 LinkedIn viewed notification detected`);
      return 'viewed';
    }
    
    // Enhanced interview patterns detection
    const interviewPatterns = [
      // Direct interview keywords
      'interview', 'interviews', 'interviewing', 'interviewed',
      'schedule', 'scheduling', 'scheduled',
      'call', 'calling', 'phone call', 'video call',
      'meeting', 'meetings', 'meet with',
      'phone screen', 'phone screening',
      'technical interview', 'technical screening',
      'coding interview', 'coding challenge',
      'onsite interview', 'on-site interview',
      'virtual interview', 'remote interview',
      'panel interview', 'team interview',
      'final interview', 'final round',
      'next round', 'next step', 'next phase',
      'interview process', 'interview stage',
      'interview round', 'interview session',
      
      // Interview invitation patterns
      'would like to interview', 'like to schedule an interview',
      'invite you for an interview', 'invite you to interview',
      'schedule an interview', 'set up an interview',
      'arrange an interview', 'coordinate an interview',
      'interview opportunity', 'interview process',
      'move to the next stage', 'proceed to interview',
      'advance to interview', 'next interview step',
      
      // Interview confirmation patterns
      'interview confirmed', 'interview scheduled',
      'interview appointment', 'interview time',
      'interview date', 'interview time slot',
      'interview reminder', 'interview preparation',
      
      // Interview feedback patterns
      'interview went well', 'interview feedback',
      'interview results', 'interview outcome',
      'next interview', 'follow-up interview',
      'second interview', 'third interview',
      
      // Interview logistics
      'interview location', 'interview venue',
      'interview format', 'interview platform',
      'interview duration', 'interview length',
      'interview preparation', 'interview tips',
      
      // Specific interview types
      'behavioral interview', 'technical assessment',
      'case study interview', 'system design interview',
      'whiteboard interview', 'pair programming',
      'code review interview', 'architecture interview',
      
      // Interview team patterns
      'interview with the team', 'meet the team',
      'interview panel', 'interview committee',
      'hiring manager interview', 'team lead interview',
      'director interview', 'VP interview',
      
      // Interview outcome patterns
      'interview successful', 'interview passed',
      'interview next steps', 'interview decision',
      'interview recommendation', 'interview approval'
    ];
    
    // Check for interview patterns with confidence scoring
    let interviewScore = 0;
    let foundInterviewPatterns = [];
    
    for (const pattern of interviewPatterns) {
      if (content.includes(pattern)) {
        interviewScore += 1;
        foundInterviewPatterns.push(pattern);
      }
    }
    
    // Additional context-based detection
    const hasInterviewInvitation = (
      content.includes('would like') && content.includes('interview') ||
      content.includes('invite') && content.includes('interview') ||
      content.includes('schedule') && content.includes('interview')
    );
    
    const hasInterviewConfirmation = (
      content.includes('interview') && (content.includes('confirmed') || content.includes('scheduled')) ||
      content.includes('interview') && (content.includes('appointment') || content.includes('time'))
    );
    
    const hasInterviewProcess = (
      content.includes('interview') && (content.includes('process') || content.includes('stage')) ||
      content.includes('next') && content.includes('interview')
    );
    
    // Calculate confidence score
    if (hasInterviewInvitation) interviewScore += 3;
    if (hasInterviewConfirmation) interviewScore += 2;
    if (hasInterviewProcess) interviewScore += 2;
    
    // High confidence interview detection
    if (interviewScore >= 2) {
      console.log(`📞 LinkedIn interview notification detected (score: ${interviewScore}, patterns: ${foundInterviewPatterns.join(', ')})`);
      return 'interview';
    }
    
    // Check for offer patterns
    if (content.includes('offer') || content.includes('congratulations') ||
        content.includes('welcome to') || content.includes('excited to have you')) {
      console.log(`🎉 LinkedIn offer notification detected`);
      return 'offer';
    }
    
    // Default to applied for LinkedIn emails
    return 'applied';
  }
  
  extractPosition(body, subject){
    // LinkedIn Easy Apply specific position patterns
    const patterns = [
      /- Position: ([^\r\n]+)/i,
      /Position: ([^\r\n]+)/i,
      /for the ([A-Za-z\s\-/()]+?) position/i,
      /interest in the ([A-Za-z\s\-/()]+?) position/i,
      /([A-Za-z\s\-/()]+?) at [A-Z]/,
      /job title: ([^\r\n]+)/i,
      /role: ([^\r\n]+)/i,
      /applied for ([A-Za-z\s\-/()]+)/i,
      /position of ([A-Za-z\s\-/()]+)/i,
      /([A-Za-z\s\-/()]+) position/i
    ];
    for (const p of patterns){
      const m = (body.match(p) || subject.match(p));
      if (m && m[1]) {
        let position = m[1].trim().replace(/\n.*$/, '').replace(/-\s*(Location|Company).*/i, '').trim();
        // Clean up common artifacts
        position = position.replace(/\s*-\s*$/, '').replace(/\s+$/, '');
        return position;
      }
    }
    return null;
  }
}
} // End of LinkedInParser class

if (!window.IndeedParser) {
window.IndeedParser = class IndeedParser {
  canParse(email){
    const fromEmail = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const isIndeed = fromEmail.includes('indeed') || fromEmail.includes('@indeed.com') || fromEmail.includes('@e.indeed.com');
    const has = ['application','applied','job','confirmation','submitted'].some(k=>subject.includes(k));
    return isIndeed && has;
  }
  async parse(email){
    const uuid = 'indeed-' + Date.now() + '-' + Math.random().toString(36).slice(2,11);
    const company = this.extractCompany(email.body || '', email.subject || '');
    const position = this.extractPosition(email.body || '', email.subject || '');
    if (!company || !position) return null;
    return { id: uuid, company, position, applicationDate: email.date, platform: 'indeed', status: 'applied', emailId: email.id, emailSubject: email.subject, emailDate: email.date };
  }
  extractCompany(body, subject){
    const patterns = [/at ([A-Z][A-Za-z\s&.,'-]+?)(?:\s+on|\.|\n|$)/, /with ([A-Z][A-Za-z\s&.,'-]+?)(?:\s+on|\.|\n|$)/, /Company:\s*([A-Za-z\s&.,'-]+)/, /Employer:\s*([A-Za-z\s&.,'-]+)/];
    for (const p of patterns){
      const m = (body.match(p) || subject.match(p));
      if (m && m[1]) return m[1].trim().replace(/\n.*$/, '').replace(/-\s*(Location|Company).*/i, '').trim();
    }
    return null;
  }
  extractPosition(body, subject){
    const patterns = [/Job Title:\s*([A-Za-z\s\-/()]+)/, /Position:\s*([A-Za-z\s\-/()]+)/, /for the ([A-Za-z\s\-/()]+?) position/i, /([A-Za-z\s\-/()]+?) at [A-Z]/];
    for (const p of patterns){
      const m = (body.match(p) || subject.match(p));
      if (m && m[1]) return m[1].trim().replace(/\n.*$/, '').replace(/-\s*(Location|Company).*/i, '').trim();
    }
    return null;
  }
}
} // End of IndeedParser class

if (!window.GenericParser) {
window.GenericParser = class GenericParser {
  canParse(email){
    const fromEmail = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.body || '').toLowerCase();
    const isFromRecruitment = ['careers','jobs','talent','recruiting','hr','glassdoor','angel.co','wellfound','noreply@apple.com','noreply@netflix.com','noreply@google.com','noreply@microsoft.com','noreply@amazon.com','noreply@meta.com','noreply@stripe.com'].some(k=>fromEmail.includes(k));
    const has = ['application','applied','job','position','developer','engineer','interview','received','confirmation','thank you','interested'].some(k=>subject.includes(k)) || body.includes('application') || body.includes('position') || body.includes('applied');
    return isFromRecruitment && has;
  }
  async parse(email){
    const id = `generic-${Date.now()}-${Math.random().toString(36).slice(2,11)}`;
    return {
      id,
      company: this.extractCompany(email),
      position: this.extractPosition(email),
      applicationDate: email.date,
      platform: this.determinePlatform(email),
      status: this.determineStatus(email),
      emailId: email.id,
      emailSubject: email.subject,
      emailDate: email.date
    };
  }
  extractCompany(email){
    const subject = email.subject || '';
    const body = email.body || '';
    
    // Enhanced patterns for company name extraction
    const patterns = [
      // Direct company mentions
      /(?:at|@)\s+([A-Z][A-Za-z\s&.,'-]+?)(?:\s*-|\s*,|\s*$)/,
      /([A-Z][A-Za-z\s&.,'-]+)\s+(?:is interested|application|careers|hiring)/i,
      /Thank you.*?(?:to|at)\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /Application.*?(?:to|at|for)\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // Company-specific patterns
      /Company:\s*([A-Za-z\s&.,'-]+)/i,
      /Employer:\s*([A-Za-z\s&.,'-]+)/i,
      /Organization:\s*([A-Za-z\s&.,'-]+)/i,
      
      // Position-based patterns
      /(?:for|as)\s+([A-Za-z\s&.,'-]+?)\s+(?:at|@)\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /([A-Za-z\s&.,'-]+?)\s+(?:at|@)\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // Application context patterns
      /applied to\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /application to\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /position at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /job at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // Thank you patterns
      /thank you for your interest in\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /thank you for applying to\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // "sent to" patterns (for applied status)
      /sent to\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /application sent to\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // "viewed by" patterns (for viewed status)
      /viewed by\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /your application.*?viewed by\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /application.*?viewed by\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      
      // Rejection patterns
      /we have decided not to move forward at\s+([A-Z][A-Za-z\s&.,'-]+)/i,
      /we are not moving forward at\s+([A-Z][A-Za-z\s&.,'-]+)/i
    ];
    
    // Try to extract company from subject and body
    for (const pattern of patterns) {
      const subjectMatch = subject.match(pattern);
      const bodyMatch = body.match(pattern);
      
      if (subjectMatch && subjectMatch[1]) {
        let company = subjectMatch[1].trim();
        // Clean up the company name
        company = company.replace(/[^\w\s&.,'-]/g, '').replace(/\s+/g, ' ').trim();
        if (company.length > 1 && company.length < 100) {
          return company;
        }
      }
      
      if (bodyMatch && bodyMatch[1]) {
        let company = bodyMatch[1].trim();
        // Clean up the company name
        company = company.replace(/[^\w\s&.,'-]/g, '').replace(/\s+/g, ' ').trim();
        if (company.length > 1 && company.length < 100) {
          return company;
        }
      }
    }
    
    // If no company found in content, return null instead of using sender domain
    return null;
  }
  extractPosition(email){
    const subject = email.subject || '';
    const body = email.body || '';
    const patterns = [/(?:Software Engineer|Software Developer|Full Stack Developer|Backend Engineer|Frontend Engineer|iOS Developer|Android Developer|Data Scientist|Product Manager|DevOps Engineer|Senior Developer|Junior Developer|Senior Engineer|Junior Engineer)/i];
    for (const p of patterns){ const m = subject.match(p); if (m) return m[0]; }
    for (const p of patterns){ const m = body.match(p); if (m) return m[0]; }
    const g = subject.match(/(?:for|as)\s+([A-Za-z\s]+?)(?:\s+at|\s+position|\s*$)/); if (g && g[1]) return g[1].trim();
    return 'Candidate';
  }
  determinePlatform(email){
    const from = (email.from || '').toLowerCase();
    if (from.includes('glassdoor')) return 'glassdoor';
    if (from.includes('angel.co') || from.includes('wellfound')) return 'other';
    if (from.includes('careers') || from.includes('jobs') || from.includes('talent')) return 'company-website';
    return 'other';
  }
  determineStatus(email){
    const content = ((email.subject || '') + ' ' + (email.body || '')).toLowerCase();
    
    // Enhanced rejection keywords and phrases (strong indicators)
    const rejectionPatterns = [
      // Direct rejection phrases
      'unfortunately', 'not selected', 'not moving forward', 'not a fit',
      'not proceed', 'decline', 'not chosen', 'not advance', 'not continue', 
      'not suitable', 'not move forward', 'decided not to move forward',
      'not moving forward at this time', 'not moving forward with your application',
      'decided to move forward in a different direction', 'not the right fit',
      'not the best fit', 'not the right candidate', 'not the best candidate',
      
      // Polite rejection phrases
      'after reviewing your application', 'after careful consideration',
      'we have decided not to move forward', 'we will not be moving forward',
      'we are not moving forward', 'we have decided to move forward in a different direction',
      'we are moving forward with other candidates', 'we have chosen to move forward with other candidates',
      'we have selected another candidate', 'we have chosen another candidate',
      'we have decided to go with another candidate', 'we have selected a different candidate',
      
      // Thank you but no phrases
      'thank you for your interest', 'thank you for applying', 'thank you for your application',
      'thank you for your time', 'thank you for your patience', 'thank you for sharing your experience',
      'we appreciate your interest', 'we appreciate your application', 'we appreciate your time',
      'we appreciate the effort you put into applying', 'we appreciate your patience',
      
      // Decision phrases
      'we have decided', 'we have chosen', 'we have selected', 'we are going with',
      'we are moving forward with', 'we have made the decision',
      
      // Different direction phrases
      'different direction', 'another direction', 'going in a different direction',
      'taking a different approach', 'pursuing other options',
      
      // Best wishes phrases (often in rejections)
      'best of luck', 'best wishes', 'good luck', 'wish you the best',
      'wish you success', 'wish you nothing but success', 'hope our paths cross again',
      'don\'t hesitate to reach out', 'reach out if there\'s anything we can do',
      
      // Application status phrases
      'not moving forward with your application', 'not proceeding with your application',
      'not continuing with your application', 'not advancing your application',
      'not moving forward with this position', 'not proceeding with this role',
      
      // Company decision phrases
      'we have decided not to move forward', 'we have chosen not to move forward',
      'we have selected not to move forward', 'we are not proceeding',
      'we are not moving forward', 'we are not continuing',
      
      // Position-specific rejections
      'for this position', 'for this role', 'for this opportunity',
      'at this time', 'at this moment', 'right now',
      
      // Polite closing phrases in rejections
      'we wish you the very best', 'we wish you all the best',
      'we hope our paths might cross again', 'we hope to cross paths again',
      'please don\'t hesitate to reach out', 'feel free to reach out',
      'if there\'s ever anything we can do', 'if there\'s anything we can do to support you'
    ];
    
    // Check for rejection patterns with confidence scoring
    let rejectionScore = 0;
    let foundRejectionPatterns = [];
    
    for (const pattern of rejectionPatterns) {
      if (content.includes(pattern)) {
        rejectionScore += 1;
        foundRejectionPatterns.push(pattern);
      }
    }
    
    // Additional context-based detection
    const hasThankYou = content.includes('thank you') || content.includes('appreciate');
    const hasDecision = content.includes('decided') || content.includes('chosen') || content.includes('selected');
    const hasNotMoving = content.includes('not moving') || content.includes('not proceeding');
    const hasBestWishes = content.includes('best') && (content.includes('wish') || content.includes('luck'));
    const hasDifferentDirection = content.includes('different direction') || content.includes('other direction');
    
    // Calculate confidence score
    if (hasThankYou && hasDecision && hasNotMoving) rejectionScore += 3;
    if (hasBestWishes && hasDecision) rejectionScore += 2;
    if (hasDifferentDirection) rejectionScore += 2;
    if (hasThankYou && hasBestWishes) rejectionScore += 1;
    
    // High confidence rejection (score >= 3 or multiple strong indicators)
    if (rejectionScore >= 3 || foundRejectionPatterns.length >= 2) {
      console.log(`🚫 High confidence rejection detected (score: ${rejectionScore}, patterns: ${foundRejectionPatterns.join(', ')})`);
      return 'rejected';
    }
    
    // Medium confidence rejection (score >= 2)
    if (rejectionScore >= 2) {
      console.log(`⚠️ Medium confidence rejection detected (score: ${rejectionScore}, patterns: ${foundRejectionPatterns.join(', ')})`);
      return 'rejected';
    }
    
    // Additional context-based rejection detection
    // Check for common rejection email structures
    const hasRejectionStructure = (
      (content.includes('thank you') && content.includes('decided')) ||
      (content.includes('appreciate') && content.includes('not moving')) ||
      (content.includes('after reviewing') && content.includes('not moving')) ||
      (content.includes('careful consideration') && content.includes('not moving')) ||
      (content.includes('sincerely appreciate') && content.includes('decided'))
    );
    
    if (hasRejectionStructure) {
      rejectionScore += 2;
      console.log(`🔍 Rejection structure detected`);
    }
    
    // Check for polite rejection closings
    const hasPoliteRejectionClosing = (
      content.includes('all the best') || 
      content.includes('best of luck') ||
      content.includes('wish you success') ||
      content.includes('hope our paths cross') ||
      content.includes('don\'t hesitate to reach out')
    );
    
    if (hasPoliteRejectionClosing && (hasDecision || hasNotMoving)) {
      rejectionScore += 1;
      console.log(`🔍 Polite rejection closing detected`);
    }
    
    // Final rejection check with updated scoring
    if (rejectionScore >= 2) {
      console.log(`🚫 Final rejection detection (score: ${rejectionScore}, patterns: ${foundRejectionPatterns.join(', ')})`);
      return 'rejected';
    }
    
    // Application viewed keywords (LinkedIn and other platforms)
    if (content.includes('your application was viewed') || 
        content.includes('your application is viewed') ||
        content.includes('application was viewed by') ||
        content.includes('application is viewed by') ||
        content.includes('viewed your application') ||
        content.includes('has viewed your application') ||
        content.includes('viewed your profile') ||
        content.includes('has viewed your profile') ||
        content.includes('viewed by') ||
        content.includes('application viewed') ||
        content.includes('profile viewed') ||
        content.includes('viewed your') ||
        content.includes('viewed the application') ||
        content.includes('viewed the profile')) {
      console.log(`👀 Application viewed notification detected`);
      return 'viewed';
    }
    
    // Enhanced interview patterns detection
    const interviewPatterns = [
      // Direct interview keywords
      'interview', 'interviews', 'interviewing', 'interviewed',
      'schedule', 'scheduling', 'scheduled',
      'call', 'calling', 'phone call', 'video call',
      'meeting', 'meetings', 'meet with',
      'phone screen', 'phone screening',
      'technical interview', 'technical screening',
      'coding interview', 'coding challenge',
      'onsite interview', 'on-site interview',
      'virtual interview', 'remote interview',
      'panel interview', 'team interview',
      'final interview', 'final round',
      'next round', 'next step', 'next phase',
      'interview process', 'interview stage',
      'interview round', 'interview session',
      
      // Interview invitation patterns
      'would like to interview', 'like to schedule an interview',
      'invite you for an interview', 'invite you to interview',
      'schedule an interview', 'set up an interview',
      'arrange an interview', 'coordinate an interview',
      'interview opportunity', 'interview process',
      'move to the next stage', 'proceed to interview',
      'advance to interview', 'next interview step',
      
      // Interview confirmation patterns
      'interview confirmed', 'interview scheduled',
      'interview appointment', 'interview time',
      'interview date', 'interview time slot',
      'interview reminder', 'interview preparation',
      
      // Interview feedback patterns
      'interview went well', 'interview feedback',
      'interview results', 'interview outcome',
      'next interview', 'follow-up interview',
      'second interview', 'third interview',
      
      // Interview logistics
      'interview location', 'interview venue',
      'interview format', 'interview platform',
      'interview duration', 'interview length',
      'interview preparation', 'interview tips',
      
      // Specific interview types
      'behavioral interview', 'technical assessment',
      'case study interview', 'system design interview',
      'whiteboard interview', 'pair programming',
      'code review interview', 'architecture interview',
      
      // Interview team patterns
      'interview with the team', 'meet the team',
      'interview panel', 'interview committee',
      'hiring manager interview', 'team lead interview',
      'director interview', 'VP interview',
      
      // Interview outcome patterns
      'interview successful', 'interview passed',
      'interview next steps', 'interview decision',
      'interview recommendation', 'interview approval'
    ];
    
    // Check for interview patterns with confidence scoring
    let interviewScore = 0;
    let foundInterviewPatterns = [];
    
    for (const pattern of interviewPatterns) {
      if (content.includes(pattern)) {
        interviewScore += 1;
        foundInterviewPatterns.push(pattern);
      }
    }
    
    // Additional context-based detection
    const hasInterviewInvitation = (
      content.includes('would like') && content.includes('interview') ||
      content.includes('invite') && content.includes('interview') ||
      content.includes('schedule') && content.includes('interview')
    );
    
    const hasInterviewConfirmation = (
      content.includes('interview') && (content.includes('confirmed') || content.includes('scheduled')) ||
      content.includes('interview') && (content.includes('appointment') || content.includes('time'))
    );
    
    const hasInterviewProcess = (
      content.includes('interview') && (content.includes('process') || content.includes('stage')) ||
      content.includes('next') && content.includes('interview')
    );
    
    // Calculate confidence score
    if (hasInterviewInvitation) interviewScore += 3;
    if (hasInterviewConfirmation) interviewScore += 2;
    if (hasInterviewProcess) interviewScore += 2;
    
    // High confidence interview detection
    if (interviewScore >= 2) {
      console.log(`📞 Interview notification detected (score: ${interviewScore}, patterns: ${foundInterviewPatterns.join(', ')})`);
      return 'interview';
    }
    
    // Offer keywords
    if (content.includes('offer') || content.includes('congratulations') ||
        content.includes('welcome to') || content.includes('excited to have you')) {
      return 'offer';
    }
    
    // Reviewing/under consideration
    if (content.includes('reviewing') || content.includes('under review') || 
        content.includes('received') || content.includes('considering') ||
        content.includes('evaluating') || content.includes('assessing')) {
      return 'reviewing';
    }
    
    // Positive interest
    if (content.includes('interested') || content.includes('next step') ||
        content.includes('move forward') || content.includes('proceed')) {
      return 'reviewing';
    }
    
    return 'applied';
  }
}
} // End of GenericParser class

// Only initialize parsers if they don't already exist
if (!window.parsers) {
  window.parsers = [new window.LinkedInParser(), new window.IndeedParser(), new window.GenericParser()];
}

// Test function for rejection detection accuracy
window.testRejectionDetection = function() {
  console.log('🧪 Testing rejection detection accuracy...');
  
  const testEmails = [
    {
      id: 'test-1',
      from: 'Lauren Nelson <lauren@company.com>',
      subject: 'Thank you for your application',
      body: `Hi Yutong,

Thank you so much for your patience. We sincerely appreciate your time and your interest in the role, and we know how much work goes into these projects. We have decided to move forward in a different direction for this position. However, we are so grateful for the time and effort you invested in the process and want you to know that your passion and qualifications were genuinely impressive.

We wish you nothing but success in your career journey, and we hope our paths might cross again in the future. Please don't hesitate to reach out if there's ever anything we can do to support you along the way.

All the best`,
      date: new Date().toISOString()
    },
    {
      id: 'test-2', 
      from: 'HR Team <hr@company.com>',
      subject: 'Application Update',
      body: `Hi Yutong,

Thank you so much for applying and sharing your experience with us! After reviewing your application, we've decided not to move forward at this time.

We truly appreciate the effort you put into applying and wish you the very best as you continue your search. You've got a lot to offer!`,
      date: new Date().toISOString()
    },
    {
      id: 'test-3',
      from: 'Recruiter <recruiter@company.com>',
      subject: 'Interview Invitation',
      body: `Hi Yutong,

Thank you for your application. We would like to schedule an interview with you for the Software Engineer position. Please let us know your availability.`,
      date: new Date().toISOString()
    },
    {
      id: 'test-4',
      from: 'LinkedIn <noreply@linkedin.com>',
      subject: 'Your application was viewed by Mary Square, LLC',
      body: `Hi Yutong,

Your application for Software Engineer at Mary Square, LLC was viewed by the hiring team. This is a positive sign that your application is being considered.

Best regards,
LinkedIn Team`,
      date: new Date().toISOString()
    },
    {
      id: 'test-5',
      from: 'LinkedIn <noreply@linkedin.com>',
      subject: 'Your application is viewed by TGR',
      body: `Hi Yutong,

Your application for Product Manager at TGR has been viewed by the company. Keep an eye out for any updates from them.

Best regards,
LinkedIn Team`,
      date: new Date().toISOString()
    },
    {
      id: 'test-6',
      from: 'LinkedIn <noreply@linkedin.com>',
      subject: 'Application Confirmation - Software Engineer at Google',
      body: `Hi Yutong,

Thank you for applying to Google for the Software Engineer position. We have received your application and will review it carefully.

Best regards,
LinkedIn Team`,
      date: new Date().toISOString()
    },
    {
      id: 'test-7',
      from: 'HR Team <hr@microsoft.com>',
      subject: 'Thank you for your application',
      body: `Hi Yutong,

Thank you for your interest in Microsoft. We have received your application for the Software Engineer position and will review it carefully.

Best regards,
Microsoft HR Team`,
      date: new Date().toISOString()
    },
    {
      id: 'test-8',
      from: 'LinkedIn <noreply@linkedin.com>',
      subject: 'Application sent to Frances Valentine',
      body: `Hi Yutong,

Your application has been sent to Frances Valentine for the Software Engineer position.

Best regards,
LinkedIn Team`,
      date: new Date().toISOString()
    },
    {
      id: 'test-9',
      from: 'LinkedIn <noreply@linkedin.com>',
      subject: 'Your application was viewed by TGR',
      body: `Hi Yutong,

Your application for Product Manager at TGR has been viewed by the company.

Best regards,
LinkedIn Team`,
      date: new Date().toISOString()
    },
    {
      id: 'test-10',
      from: 'LinkedIn <noreply@linkedin.com>',
      subject: 'Your application to Live Event Graphic Designer and Presentation Specialist at ADM Creative Group',
      body: `Hi Yutong,

Your update from ADM Creative Group

Live Event Graphic Designer and Presentation Specialist
ADM Creative Group - United States
Applied on Sep 23

Thank you for your interest in the Live Event Graphic Designer and Presentation Specialist position at ADM Creative Group in United States. Unfortunately, we will not be moving forward with your application, but we appreciate your time and interest in ADM Creative Group.

Regards,
ADM Creative Group`,
      date: new Date().toISOString()
    },
    {
      id: 'test-11',
      from: 'LinkedIn <noreply@linkedin.com>',
      subject: 'Your update from TechCorp',
      body: `Hi Yutong,

Your update from TechCorp

Software Engineer
TechCorp - San Francisco, CA
Applied on Sep 20

Thank you for your interest in the Software Engineer position at TechCorp. We have decided to move forward in a different direction for this position, but we appreciate your time and interest in TechCorp.

Best regards,
TechCorp Team`,
      date: new Date().toISOString()
    }
  ];
  
  const parser = new GenericParser();
  
  testEmails.forEach((email, index) => {
    console.log(`\n📧 Test Email ${index + 1}:`);
    console.log(`From: ${email.from}`);
    console.log(`Subject: ${email.subject}`);
    console.log(`Body preview: ${email.body.substring(0, 100)}...`);
    
    // Test status detection
    const status = parser.determineStatus(email);
    console.log(`🎯 Detected Status: ${status}`);
    
    // Test company extraction
    const company = parser.extractCompany(email);
    console.log(`🏢 Extracted Company: ${company}`);
    
    // Test platform detection
    const platform = parser.determinePlatform(email);
    console.log(`🌐 Detected Platform: ${platform}`);
    
    let expectedStatus = 'applied';
    let expectedCompany = null;
    let expectedPlatform = 'other';
    
    if (index < 2) {
      expectedStatus = 'rejected';
      expectedCompany = 'Unknown';
    } else if (index === 2) {
      expectedStatus = 'interview';
      expectedCompany = 'Unknown';
    } else if (index >= 3 && index <= 5) {
      expectedStatus = 'viewed';
      expectedPlatform = 'linkedin';
      if (index === 3) expectedCompany = 'Mary Square, LLC';
      else if (index === 4) expectedCompany = 'TGR';
      else if (index === 5) expectedCompany = 'Google';
    } else if (index === 6) {
      expectedStatus = 'applied';
      expectedCompany = 'Microsoft';
      expectedPlatform = 'company-website';
    } else if (index === 7) {
      expectedStatus = 'applied';
      expectedCompany = 'Frances Valentine';
      expectedPlatform = 'linkedin';
    } else if (index === 8) {
      expectedStatus = 'viewed';
      expectedCompany = 'TGR';
      expectedPlatform = 'linkedin';
    } else if (index === 9) {
      expectedStatus = 'rejected';
      expectedCompany = 'ADM Creative Group';
      expectedPlatform = 'linkedin';
    } else if (index === 10) {
      expectedStatus = 'rejected';
      expectedCompany = 'TechCorp';
      expectedPlatform = 'linkedin';
    }
    
    console.log(`✅ Expected Status: ${expectedStatus}`);
    console.log(`✅ Expected Company: ${expectedCompany}`);
    console.log(`✅ Expected Platform: ${expectedPlatform}`);
    
    const statusCorrect = status === expectedStatus;
    const companyCorrect = company === expectedCompany;
    const platformCorrect = platform === expectedPlatform;
    
    console.log(`📊 Status: ${statusCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    console.log(`📊 Company: ${companyCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    console.log(`📊 Platform: ${platformCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    console.log(`📊 Overall: ${statusCorrect && companyCorrect && platformCorrect ? '✅ ALL CORRECT' : '❌ SOME INCORRECT'}`);
  });
  
  console.log('\n🎉 Rejection detection test completed!');
};


