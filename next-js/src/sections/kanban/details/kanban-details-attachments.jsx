import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';

import { UploadBox, MultiFilePreview } from 'src/components/upload';

// ----------------------------------------------------------------------

export function KanbanDetailsAttachments({ attachments }) {
  const [files, setFiles] = useState(attachments);

  const handleDrop = useCallback(
    (acceptedFiles) => {
      setFiles([...files, ...acceptedFiles]);
    },
    [files]
  );

  const handleRemoveFile = useCallback(
    (inputFile) => {
      const filtered = files.filter((file) => file !== inputFile);
      setFiles(filtered);
    },
    [files]
  );

  // When no files, show full-width upload box
  if (!files?.length) {
    return (
      <Box sx={{ flex: 1 }}>
        <UploadBox onDrop={handleDrop} />
      </Box>
    );
  }

  return (
    <MultiFilePreview
      files={files}
      onRemove={(file) => handleRemoveFile(file)}
      endNode={<UploadBox onDrop={handleDrop} />}
      thumbnail={{ sx: { width: 64, height: 64 } }}
    />
  );
}
