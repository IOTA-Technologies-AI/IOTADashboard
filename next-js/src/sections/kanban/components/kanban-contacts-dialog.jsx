import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { LoadingScreen } from 'src/components/loading-screen';
import { SearchNotFound } from 'src/components/search-not-found';

// ----------------------------------------------------------------------

const ITEM_HEIGHT = 64;

export function KanbanContactsDialog({ assignee = [], open, onClose, onSelect }) {
  const [searchContact, setSearchContact] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    let active = true;
    const fetchContacts = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/graph/users', {
          cache: 'no-store',
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to load users');
        }

        const data = await res.json();
        if (active) {
          setContacts(data?.users ?? []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load users');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchContacts();
  }, [open]);

  const handleSearchContacts = useCallback((event) => {
    setSearchContact(event.target.value);
  }, []);

  const handleSelect = useCallback(
    (contact) => {
      onSelect?.(contact);
    },
    [onSelect]
  );

  const dataFiltered = applyFilter({ inputData: contacts, query: searchContact });

  const notFound = !dataFiltered.length && !!searchContact && !loading;

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose}>
      <DialogTitle sx={{ pb: 0 }}>
        Contacts <span>({contacts.length})</span>
      </DialogTitle>

      <Box sx={{ px: 3, py: 2.5 }}>
        <TextField
          fullWidth
          value={searchContact}
          onChange={handleSearchContacts}
          placeholder="Search..."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ py: 4 }}>
            <LoadingScreen />
          </Box>
        ) : error ? (
          <Box sx={{ py: 4, textAlign: 'center', color: 'error.main', typography: 'body2' }}>
            {error}
          </Box>
        ) : notFound ? (
          <SearchNotFound query={searchContact} sx={{ mt: 3, mb: 10 }} />
        ) : (
          <Scrollbar sx={{ height: ITEM_HEIGHT * 6, px: 2.5 }}>
            <Box component="ul">
              {dataFiltered.map((contact) => {
                const checked = assignee.some((person) => person.id === contact.id);

                return (
                  <Box
                    component="li"
                    key={contact.id}
                    sx={{
                      gap: 2,
                      display: 'flex',
                      height: ITEM_HEIGHT,
                      alignItems: 'center',
                    }}
                  >
                    <Avatar src={contact.avatarUrl}>{contact.name?.[0]?.toUpperCase()}</Avatar>

                    <ListItemText primary={contact.name} secondary={contact.email} />

                    <Button
                      size="small"
                      onClick={() => handleSelect(contact)}
                      color={checked ? 'primary' : 'inherit'}
                      startIcon={
                        <Iconify
                          width={16}
                          icon={checked ? 'eva:checkmark-fill' : 'mingcute:add-line'}
                          sx={{ mr: -0.5 }}
                        />
                      }
                    >
                      {checked ? 'Assigned' : 'Assign'}
                    </Button>
                  </Box>
                );
              })}
            </Box>
          </Scrollbar>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, query }) {
  if (!query) return inputData;

  return inputData.filter(({ name, email }) =>
    [name, email].some((field) => field?.toLowerCase().includes(query.toLowerCase()))
  );
}
