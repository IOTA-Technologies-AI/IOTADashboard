
  const handlePreviewHTML = useCallback(() => {
    const data = getValues();
    setFormData({ ...data, totalSalary });
    setHtmlPreviewOpen(true);
  }, [getValues, totalSalary]);

  const handleCloseHTMLPreview = useCallback(() => {
    setHtmlPreviewOpen(false);
  }, []);
