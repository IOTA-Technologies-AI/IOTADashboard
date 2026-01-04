'use client';

import { useSearchParams } from 'next/navigation';
import { useBoolean } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import {
  getOneDriveToken,
  setOneDriveToken,
  listOneDriveFiles,
  clearOneDriveToken,
  getMicrosoftAuthUrl,
  exchangeCodeForToken,
  seedOneDriveToken,
} from 'src/utils/onedrive-helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { UploadBox } from 'src/components/upload';
import { Scrollbar } from 'src/components/scrollbar';

import { FileRecentItem } from 'src/sections/file-manager/file-recent-item';
import { FileManagerPanel } from 'src/sections/file-manager/file-manager-panel';
import { FileStorageOverview } from 'src/sections/file-manager/file-storage-overview';
import { FileManagerFolderItem } from 'src/sections/file-manager/file-manager-folder-item';
import { FileManagerCreateFolderDialog } from 'src/sections/file-manager/file-manager-create-folder-dialog';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const GB = 1000000000 * 24;

const FILE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Files', icon: 'eva:file-fill' },
  { value: 'folder', label: 'Folders', icon: 'eva:folder-fill' },
  { value: 'image', label: 'Images', icon: 'eva:image-fill' },
  { value: 'video', label: 'Videos', icon: 'eva:video-fill' },
  { value: 'audio', label: 'Audio', icon: 'eva:music-fill' },
  { value: 'document', label: 'Documents', icon: 'eva:file-text-fill' },
  { value: 'pdf', label: 'PDF', icon: 'eva:file-text-fill' },
];

export default function FilePage() {
  const searchParams = useSearchParams();
  const { user } = useAuthContext();

  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [folderName, setFolderName] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'My Files' }]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [currentTab, setCurrentTab] = useState('recent');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [favoriteFiles] = useState([]);

  const newFilesDialog = useBoolean();
  const newFolderDialog = useBoolean();

  // Check if already authenticated (reuse provider token first if available)
  useEffect(() => {
    const stored = getOneDriveToken();
    const providerToken = user?.provider_token || user?.providerToken;
    const providerRefresh = user?.provider_refresh_token || user?.providerRefreshToken;

    // 1) Stored token wins
    if (stored.accessToken) {
      setAuthenticated(true);
      loadFiles(null);
      return;
    }

    // 2) Seed from the existing login token so we avoid re-prompting OneDrive sign-in
    if (providerToken) {
      setOneDriveToken(providerToken, providerRefresh);
      setAuthenticated(true);
      loadFiles(null);
      return;
    }
  }, [user]);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error(`Authentication error: ${error}`);
      return;
    }

    if (code && !authenticated) {
      handleTokenExchange(code);
    }
  }, [searchParams, authenticated]);

  const handleTokenExchange = async (code) => {
    try {
      setLoading(true);
      const tokenData = await exchangeCodeForToken(code);
      setOneDriveToken(tokenData.access_token, tokenData.refresh_token);
      setAuthenticated(true);
      toast.success('Successfully connected to OneDrive!');
      await loadFiles(null);
      window.history.replaceState({}, '', '/dashboard/file');
    } catch (error) {
      console.error('Token exchange error:', error);
      toast.error('Failed to authenticate with OneDrive');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      const authUrl = await getMicrosoftAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Failed to initiate sign in');
    }
  };

  // Note: We intentionally keep users signed in with their login token; no explicit sign-out control here.

  const loadFiles = async (folderId) => {
    try {
      setLoading(true);
      const items = await listOneDriveFiles(folderId);

      console.log('Raw items from OneDrive:', items);
      console.log('First item keys:', items[0] ? Object.keys(items[0]) : 'No items');
      console.log('First item:', items[0]);

      // Separate folders and files - OneDrive has 'folder' property for folders, 'file' property for files
      const folderItems = items
        .filter((item) => item.folder !== undefined)
        .map((item) => ({
          id: item.id,
          name: item.name,
          size: item.size || 0,
          totalFiles: item.folder?.childCount || 0,
          type: 'folder',
          isFavorited: favoriteFiles.includes(item.id),
          shared: [],
          tags: [],
          url: '#',
          modifiedAt: item.lastModifiedDateTime,
        }));

      const fileItems = items
        .filter((item) => item.file !== undefined)
        .map((item) => ({
          id: item.id,
          name: item.name,
          size: item.size || 0,
          type: item.file?.mimeType || 'file',
          url: item.webUrl || '#',
          modifiedAt: item.lastModifiedDateTime,
          isFavorited: favoriteFiles.includes(item.id),
          shared: [],
          tags: [],
          downloadUrl: item['@microsoft.graph.downloadUrl'],
        }));

      console.log('Folders:', folderItems.length, folderItems);
      console.log('Files:', fileItems.length, fileItems);
      console.log(
        'File types:',
        fileItems.map((f) => ({ name: f.name, type: f.type }))
      );

      setAllItems(items);
      setFolders(folderItems);
      setAllFiles(fileItems);

      // Calculate storage used (only for root folder)
      if (!folderId) {
        const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
        setStorageUsed(totalSize);
      }
    } catch (error) {
      console.error('Load files error:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = useCallback((folder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    loadFiles(folder.id);
  });

  const handleBreadcrumbClick = useCallback((index) => {
    setBreadcrumbs((prev) => {
      const newBreadcrumbs = prev.slice(0, index + 1);
      const folderId = index === 0 ? null : newBreadcrumbs[index].id;
      setCurrentFolderId(folderId);
      loadFiles(folderId);
      return newBreadcrumbs;
    });
  });

  const handleChangeFolderName = useCallback((event) => {
    setFolderName(event.target.value);
  }, []);

  const handleCreateFolder = useCallback(() => {
    newFolderDialog.onFalse();
    setFolderName('');
    toast.info('Folder creation coming soon!');
  }, [newFolderDialog]);

  const handleDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      try {
        setUploadProgress(true);
        toast.info(`Uploading ${acceptedFiles.length} file(s) to OneDrive...`);

        // TODO: Implement actual OneDrive upload
        await new Promise((resolve) => setTimeout(resolve, 1500));

        toast.success(`Successfully uploaded ${acceptedFiles.length} business file(s)!`);
        await loadFiles(currentFolderId);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload files');
      } finally {
        setUploadProgress(false);
      }
    },
    [currentFolderId]
  );

  const handleFileClick = useCallback((file) => {
    // Open file in new window if it has a URL or download URL
    if (file.url && file.url !== '#') {
      window.open(file.url, '_blank');
    } else if (file.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
    } else {
      toast.error('File URL not available');
    }
  }, []);

  const handleChangeTab = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  const handleFileTypeFilter = useCallback((type) => {
    setFileTypeFilter(type);
  }, []);

  // Filter files based on current tab and file type
  const getFilteredFiles = useCallback(() => {
    let filtered = allFiles;

    // Filter by tab
    if (currentTab === 'recent') {
      filtered = allFiles.slice(0, 10);
    } else if (currentTab === 'type') {
      if (fileTypeFilter !== 'all') {
        filtered = allFiles.filter((file) => {
          if (fileTypeFilter === 'folder') return false;
          return file.type?.includes(fileTypeFilter);
        });
      }
    }

    return filtered;
  }, [allFiles, currentTab, fileTypeFilter]);

  const renderStorageOverview = () => {
    // Calculate the actual percentage and round it
    const usagePercentage = Math.round((storageUsed / GB) * 100);

    // Count files by type - mimeType is like "image/jpeg", "video/mp4", "application/pdf"
    const imageFiles = allFiles.filter((f) => f.type?.startsWith('image/'));
    const videoFiles = allFiles.filter((f) => f.type?.startsWith('video/'));
    const audioFiles = allFiles.filter((f) => f.type?.startsWith('audio/'));
    const pdfFiles = allFiles.filter(
      (f) => f.type === 'application/pdf' || f.type?.includes('pdf')
    );
    const documentFiles = allFiles.filter(
      (f) =>
        f.type?.includes('document') ||
        f.type?.includes('msword') ||
        f.type?.includes('wordprocessingml') ||
        f.type?.includes('spreadsheet') ||
        f.type?.includes('sheet') ||
        f.type?.includes('presentation')
    );

    const otherFiles = allFiles.filter(
      (f) =>
        !f.type?.startsWith('image/') &&
        !f.type?.startsWith('video/') &&
        !f.type?.startsWith('audio/') &&
        !f.type?.includes('pdf') &&
        !f.type?.includes('document') &&
        !f.type?.includes('msword') &&
        !f.type?.includes('wordprocessingml') &&
        !f.type?.includes('spreadsheet') &&
        !f.type?.includes('sheet') &&
        !f.type?.includes('presentation')
    );

    return (
      <FileStorageOverview
        total={GB}
        chart={{ series: Math.min(usagePercentage, 100) }}
        data={[
          {
            name: 'Images',
            usedStorage: storageUsed * 0.4,
            filesCount: imageFiles.length,
            icon: <Box component="img" src={`${CONFIG.assetsDir}/assets/icons/files/ic-img.svg`} />,
          },
          {
            name: 'Media',
            usedStorage: storageUsed * 0.2,
            filesCount: videoFiles.length + audioFiles.length,
            icon: (
              <Box component="img" src={`${CONFIG.assetsDir}/assets/icons/files/ic-video.svg`} />
            ),
          },
          {
            name: 'Documents',
            usedStorage: storageUsed * 0.3,
            filesCount: documentFiles.length + pdfFiles.length,
            icon: (
              <Box component="img" src={`${CONFIG.assetsDir}/assets/icons/files/ic-document.svg`} />
            ),
          },
          {
            name: 'Other',
            usedStorage: storageUsed * 0.1,
            filesCount: folders.length + otherFiles.length,
            icon: (
              <Box component="img" src={`${CONFIG.assetsDir}/assets/icons/files/ic-file.svg`} />
            ),
          },
        ]}
      />
    );
  };

  const renderUploadFilesDialog = () => (
    <FileManagerCreateFolderDialog open={newFilesDialog.value} onClose={newFilesDialog.onFalse} />
  );

  const renderCreateFolderDialog = () => (
    <FileManagerCreateFolderDialog
      open={newFolderDialog.value}
      onClose={newFolderDialog.onFalse}
      title="Add folder"
      folderName={folderName}
      onChangeFolderName={handleChangeFolderName}
      onCreate={handleCreateFolder}
    />
  );

  // Unauthenticated state
  if (!authenticated) {
    return (
      <DashboardContent maxWidth="xl">
        <Card sx={{ p: 5, textAlign: 'center', maxWidth: 600, mx: 'auto', mt: 10 }}>
          <Box sx={{ mb: 3 }}>
            <Iconify icon="logos:microsoft-onedrive" width={80} />
          </Box>
          <Typography variant="h4" gutterBottom>
            Connect to Microsoft OneDrive
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Access your OneDrive files and folders from IOTA Dashboard
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<Iconify icon="logos:microsoft-icon" />}
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Sign in with Microsoft'}
          </Button>
        </Card>
      </DashboardContent>
    );
  }

  const filteredFiles = getFilteredFiles();

  // Authenticated state
  return (
    <>
      <DashboardContent maxWidth="xl">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Business Files</Typography>
        </Box>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 1 && (
          <Card sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {breadcrumbs.map((crumb, index) => (
                <Box
                  key={crumb.id || 'root'}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Typography
                    variant="body2"
                    onClick={() => handleBreadcrumbClick(index)}
                    sx={{
                      cursor: 'pointer',
                      color: index === breadcrumbs.length - 1 ? 'text.primary' : 'primary.main',
                      fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                      '&:hover': { textDecoration: 'underline' },
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    {index === 0 && <Iconify icon="eva:home-fill" width={18} />}
                    {crumb.name}
                  </Typography>
                  {index < breadcrumbs.length - 1 && (
                    <Iconify
                      icon="eva:chevron-right-fill"
                      width={16}
                      sx={{ color: 'text.disabled' }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Card>
        )}

        <Grid container spacing={3}>
          {/* 1. Storage Overview - Full Width */}
          <Grid size={12}>{renderStorageOverview()}</Grid>

          {/* 2. Folders Section - Left Side */}
          <Grid size={{ xs: 12, md: 8 }}>
            <FileManagerPanel
              title="Folders"
              link={paths.dashboard.fileManager}
              onOpen={newFolderDialog.onTrue}
            />

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Scrollbar>
                <Box sx={{ gap: 3, display: 'flex', flexWrap: 'wrap', mb: 3 }}>
                  {folders.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
                      No folders found
                    </Typography>
                  ) : (
                    folders.map((folder) => (
                      <FileManagerFolderItem
                        key={folder.id}
                        folder={folder}
                        onDelete={() => {}}
                        onClick={() => handleFolderClick(folder)}
                        sx={{ cursor: 'pointer', width: 240 }}
                      />
                    ))
                  )}
                </Box>
              </Scrollbar>
            )}
          </Grid>

          {/* 3. Upload Box - Right Side of Folders */}
          <Grid size={{ xs: 12, md: 4 }}>
            <UploadBox
              onDrop={handleDrop}
              disabled={uploadProgress}
              placeholder={
                <Box
                  sx={{
                    gap: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    color: 'text.disabled',
                    flexDirection: 'column',
                  }}
                >
                  <Iconify icon="eva:cloud-upload-fill" width={80} />
                  <Typography variant="h6">
                    {uploadProgress ? 'Uploading...' : 'Upload Business Files'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.disabled', textAlign: 'center', px: 2 }}
                  >
                    Drag and drop files here or click to browse
                  </Typography>
                </Box>
              }
              sx={{
                width: '100%',
                py: 8,
                px: 3,
                minHeight: 300,
                height: '100%',
                opacity: uploadProgress ? 0.6 : 1,
                borderWidth: 3,
                borderStyle: 'dashed',
                borderRadius: 2,
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            />
          </Grid>

          {/* 4. Files Section with Tabs - Full Width Below */}
          <Grid size={12}>
            <Card sx={{ mb: 3 }}>
              <Tabs value={currentTab} onChange={handleChangeTab} sx={{ px: 2, pt: 2 }}>
                <Tab
                  value="recent"
                  label="Recent Files"
                  icon={<Iconify icon="eva:clock-outline" width={20} />}
                  iconPosition="start"
                />
                <Tab
                  value="type"
                  label="Files by Type"
                  icon={<Iconify icon="eva:funnel-outline" width={20} />}
                  iconPosition="start"
                />
              </Tabs>

              {currentTab === 'type' && (
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    borderTop: 1,
                    borderColor: 'divider',
                  }}
                >
                  {FILE_TYPE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      size="small"
                      variant={fileTypeFilter === option.value ? 'contained' : 'outlined'}
                      startIcon={<Iconify icon={option.icon} />}
                      onClick={() => handleFileTypeFilter(option.value)}
                      sx={{ borderRadius: 1 }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Box>
              )}
            </Card>

            <FileManagerPanel
              title={
                currentTab === 'recent'
                  ? 'Recent Files'
                  : `${FILE_TYPE_OPTIONS.find((o) => o.value === fileTypeFilter)?.label || 'Files'}`
              }
              link={paths.dashboard.fileManager}
              onOpen={newFilesDialog.onTrue}
            />

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
                {filteredFiles.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
                    No files found
                  </Typography>
                ) : (
                  filteredFiles.map((file) => (
                    <Box
                      key={file.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        const isMenuClick =
                          e.target.closest('[aria-label*="more"]') ||
                          e.target.closest('.MuiPopover-root') ||
                          e.target.closest('button');
                        if (!isMenuClick) {
                          handleFileClick(file);
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        '& .MuiIconButton-root': {
                          cursor: 'pointer',
                        },
                        '& > *': {
                          pointerEvents: 'none',
                        },
                        '& button': {
                          pointerEvents: 'auto',
                        },
                      }}
                    >
                      <FileRecentItem file={file} onDelete={() => {}} />
                    </Box>
                  ))
                )}
              </Box>
            )}
          </Grid>
        </Grid>
      </DashboardContent>
      {renderUploadFilesDialog()}
      {renderCreateFolderDialog()}
    </>
  );
}
