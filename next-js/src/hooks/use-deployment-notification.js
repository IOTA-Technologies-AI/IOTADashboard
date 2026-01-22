import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://staging-iotaapiserver-s572.encr.app';

// Poll every 2 minutes for new deployments
const POLL_INTERVAL = 120000; // 2 minutes

export function useDeploymentNotification() {
  const [hasNewDeployment, setHasNewDeployment] = useState(false);
  const [deploymentInfo, setDeploymentInfo] = useState(null);
  const [lastKnownTimestamp, setLastKnownTimestamp] = useState(null);

  const checkForNewDeployment = useCallback(async () => {
    try {
      const params = lastKnownTimestamp ? { lastKnownTimestamp } : {};
      const response = await axios.get(`${API_BASE_URL}/webhook/latest-deployment`, { params });

      if (response.data?.hasNewDeployment && response.data?.deployment) {
        setHasNewDeployment(true);
        setDeploymentInfo(response.data.deployment);
        setLastKnownTimestamp(response.data.deployment.timestamp);

        console.log('[Deployment] New deployment detected:', response.data.deployment);
      }
    } catch (error) {
      console.error('[Deployment] Failed to check for new deployment:', error);
    }
  }, [lastKnownTimestamp]);

  const dismissNotification = useCallback(() => {
    setHasNewDeployment(false);
  }, []);

  const refreshPage = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    // Initial check
    checkForNewDeployment();

    // Set up polling interval
    const intervalId = setInterval(checkForNewDeployment, POLL_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [checkForNewDeployment]);

  return {
    hasNewDeployment,
    deploymentInfo,
    dismissNotification,
    refreshPage,
  };
}
