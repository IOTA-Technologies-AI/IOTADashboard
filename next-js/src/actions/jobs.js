import axios from 'axios';

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';

// =============================================
// Job CRUD Operations
// =============================================

export async function getJobs(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    if (params.jobType) queryParams.append('jobType', params.jobType);
    if (params.department) queryParams.append('department', params.department);
    if (params.isRemote !== undefined) queryParams.append('isRemote', params.isRemote);
    if (params.isFeatured !== undefined) queryParams.append('isFeatured', params.isFeatured);

    const url = `${API_BASE_URL}/jobs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await axios.get(url);
    return response.data?.jobs || [];
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
}

export async function getJob(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/jobs/${id}`);
    return response.data?.job || null;
  } catch (error) {
    const status = error?.response?.status;
    console.error(`Error fetching job ${id}:`, status, error?.response?.data || error.message);
    return null;
  }
}

export async function createJob(jobData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/jobs`, jobData);
    return response.data?.job || response.data;
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }
}

export async function updateJob(id, jobData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/jobs/${id}`, { id, ...jobData });
    return response.data?.job || response.data;
  } catch (error) {
    console.error(`Error updating job ${id}:`, error);
    throw error;
  }
}

export async function deleteJob(id) {
  try {
    await axios.delete(`${API_BASE_URL}/jobs/${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting job ${id}:`, error);
    throw error;
  }
}

// =============================================
// Webflow Sync Operations
// =============================================

export async function syncJobToWebflow(jobId, publish = true) {
  try {
    const response = await axios.post(`${API_BASE_URL}/jobs/${jobId}/sync-to-webflow`, {
      jobId,
      publish,
    });
    return response.data;
  } catch (error) {
    console.error(`Error syncing job ${jobId} to Webflow:`, error);
    throw error;
  }
}

export async function publishToWebflow() {
  try {
    const response = await axios.post(`${API_BASE_URL}/webflow/publish`);
    return response.data;
  } catch (error) {
    console.error('Error publishing to Webflow:', error);
    throw error;
  }
}

export async function testWebflowConnection() {
  try {
    const response = await axios.get(`${API_BASE_URL}/webflow/test`);
    return response.data;
  } catch (error) {
    console.error('Error testing Webflow connection:', error);
    throw error;
  }
}

export async function fetchJobsFromWebflow() {
  try {
    const response = await axios.get(`${API_BASE_URL}/webflow/jobs`);
    return response.data?.jobs || [];
  } catch (error) {
    console.error('Error fetching jobs from Webflow:', error);
    return [];
  }
}

// =============================================
// Job Approval Operations
// =============================================

export async function approveJob(jobId, approvedBy) {
  try {
    const response = await axios.post(`${API_BASE_URL}/jobs/${jobId}/approve`, {
      id: jobId,
      approvedBy,
    });
    return response.data;
  } catch (error) {
    console.error(`Error approving job ${jobId}:`, error);
    throw error;
  }
}

export async function rejectJob(jobId, rejectedBy, rejectionReason) {
  try {
    const response = await axios.post(`${API_BASE_URL}/jobs/${jobId}/reject`, {
      id: jobId,
      rejectedBy,
      rejectionReason,
    });
    return response.data;
  } catch (error) {
    console.error(`Error rejecting job ${jobId}:`, error);
    throw error;
  }
}

export async function resubmitJobForApproval(jobId, resubmittedBy) {
  try {
    const response = await axios.post(`${API_BASE_URL}/jobs/${jobId}/resubmit`, {
      id: jobId,
      resubmittedBy,
    });
    return response.data;
  } catch (error) {
    console.error(`Error resubmitting job ${jobId}:`, error);
    throw error;
  }
}

// =============================================
// Job Application Operations
// =============================================

export async function submitJobApplication(jobId, applicationData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/jobs/${jobId}/apply`, {
      jobId,
      ...applicationData,
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting job application:', error);
    throw error;
  }
}

export async function getJobApplications(jobId, status) {
  try {
    const url = status
      ? `${API_BASE_URL}/jobs/${jobId}/applications?status=${status}`
      : `${API_BASE_URL}/jobs/${jobId}/applications`;
    const response = await axios.get(url);
    return response.data?.applications || [];
  } catch (error) {
    console.error('Error fetching job applications:', error);
    return [];
  }
}

export async function updateJobApplicationStatus(applicationId, status, notes, reviewedBy) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/applications/${applicationId}`, {
      id: applicationId,
      status,
      notes,
      reviewedBy,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating application status:', error);
    throw error;
  }
}

// =============================================
// Integration Operations
// =============================================

export async function getIntegration(integrationName, integrationType) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/integrations/${integrationName}/${integrationType}`
    );
    return response.data?.integration || null;
  } catch (error) {
    console.error('Error fetching integration:', error);
    return null;
  }
}

export async function updateIntegration(integrationName, integrationType, data) {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/integrations/${integrationName}/${integrationType}`,
      { integrationName, integrationType, ...data }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating integration:', error);
    throw error;
  }
}

// =============================================
// Job Type Options (for UI)
// =============================================

export const JOB_TYPE_OPTIONS = [
  { label: 'Full-time', value: 'Full-time' },
  { label: 'Part-time', value: 'Part-time' },
  { label: 'Contract', value: 'Contract' },
  { label: 'Internship', value: 'Internship' },
  { label: 'Freelance', value: 'Freelance' },
];

export const DEPARTMENT_OPTIONS = [
  { label: 'Engineering', value: 'Engineering' },
  { label: 'Product', value: 'Product' },
  { label: 'Design', value: 'Design' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'Sales', value: 'Sales' },
  { label: 'Operations', value: 'Operations' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Human Resources', value: 'Human Resources' },
  { label: 'Customer Success', value: 'Customer Success' },
];

export const EXPERIENCE_LEVEL_OPTIONS = [
  { label: 'Entry Level', value: 'Entry' },
  { label: 'Mid Level', value: 'Mid' },
  { label: 'Senior Level', value: 'Senior' },
  { label: 'Lead', value: 'Lead' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Director', value: 'Director' },
];

export const REMOTE_TYPE_OPTIONS = [
  { label: 'On-site', value: 'On-site' },
  { label: 'Hybrid', value: 'Hybrid' },
  { label: 'Fully Remote', value: 'Fully Remote' },
];

export const JOB_STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' },
];

export const TECHNOLOGY_AREA_OPTIONS = [
  { label: 'React', value: 'React' },
  { label: 'Node.js', value: 'Node.js' },
  { label: 'Python', value: 'Python' },
  { label: 'Java', value: 'Java' },
  { label: 'JavaScript', value: 'JavaScript' },
  { label: 'TypeScript', value: 'TypeScript' },
  { label: 'Flutter', value: 'Flutter' },
  { label: 'React Native', value: 'React Native' },
  { label: 'iOS/Swift', value: 'iOS/Swift' },
  { label: 'Android/Kotlin', value: 'Android/Kotlin' },
  { label: 'Machine Learning', value: 'Machine Learning' },
  { label: 'DevOps', value: 'DevOps' },
  { label: 'Cloud/AWS', value: 'Cloud/AWS' },
  { label: 'Data Science', value: 'Data Science' },
  { label: 'Cybersecurity', value: 'Cybersecurity' },
];
