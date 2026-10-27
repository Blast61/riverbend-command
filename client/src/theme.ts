import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
  palette: { primary: { main: '#235e4b', dark: '#163e32' }, secondary: { main: '#b98b3d' },
    background: { default: '#f5f6f3', paper: '#ffffff' }, text: { primary: '#1c302a', secondary: '#62716a' },
    divider: '#e1e6e0', success: { main: '#28724d' }, warning: { main: '#956216' } },
  typography: { fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: { fontWeight: 650, letterSpacing: '-0.04em' }, h5: { fontWeight: 650, letterSpacing: '-0.03em' },
    h6: { fontWeight: 650, fontSize: '1.05rem' }, button: { textTransform: 'none', fontWeight: 600 }, body2: { fontSize: '.85rem' } },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 7, minHeight: 38 } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '.875rem' } } },
    MuiOutlinedInput: { styleOverrides: { root: { background: '#fff', fontSize: '.875rem' } } },
    MuiTableCell: { styleOverrides: { head: { background: '#f8faf7', color: '#65756c', fontSize: '.7rem', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' }, body: { fontSize: '.85rem' } } },
  },
});
