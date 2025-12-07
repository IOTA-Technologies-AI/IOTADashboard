import PropTypes from 'prop-types';
import { useState, useCallback, useMemo } from 'react';

import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';

import { BDMCard } from './bdm-card';

export function BDMCardList({ bdms }) {
  const [page, setPage] = useState(1);
  const rowsPerPage = 12;

  const paged = useMemo(
    () => bdms.slice((page - 1) * rowsPerPage, (page - 1) * rowsPerPage + rowsPerPage),
    [bdms, page]
  );

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  return (
    <>
      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        }}
      >
        {paged.map((bdm) => (
          <BDMCard key={bdm.id} bdm={bdm} />
        ))}
      </Box>

      <Pagination
        page={page}
        shape="circular"
        count={Math.ceil(bdms.length / rowsPerPage) || 1}
        onChange={handleChangePage}
        sx={{ mt: { xs: 5, md: 8 }, mx: 'auto' }}
      />
    </>
  );
}

BDMCardList.propTypes = {
  bdms: PropTypes.array,
};
