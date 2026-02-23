import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    issueState: {
      openBg: string;
      openColor: string;
      closedBg: string;
      closedColor: string;
    };
  }
  interface PaletteOptions {
    issueState?: {
      openBg: string;
      openColor: string;
      closedBg: string;
      closedColor: string;
    };
  }
}

export const theme = createTheme({
  palette: {
    primary: { main: "#222" },
    error: { main: "#cf222e" },
    success: { main: "#1a7f37" },
    secondary: { main: "#8250df" },
    warning: {
      main: "#f97316",
      light: "#fff8f0",
      dark: "#9a3412",
    },
    text: {
      primary: "#24292f",
      secondary: "#656d76",
      disabled: "#8c959f",
    },
    background: {
      paper: "#fff",
    },
    grey: {
      50: "#f6f8fa",
    },
    divider: "#d0d7de",
    issueState: {
      openBg: "#dafbe1",
      openColor: "#1a7f37",
      closedBg: "#f0e6ff",
      closedColor: "#8250df",
    },
  },
  typography: {
    body1: { fontSize: 13 },
    body2: { fontSize: 12 },
    caption: { fontSize: 11 },
    subtitle1: { fontSize: 15, fontWeight: 600, lineHeight: 1.4 },
    subtitle2: { fontSize: 14, fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontSize: 13 },
        sizeSmall: { fontSize: 12 },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiFormControl: {
      defaultProps: { size: "small" },
    },
    MuiAutocomplete: {
      defaultProps: { size: "small" },
    },
    MuiAlert: {
      styleOverrides: {
        root: { fontSize: 12, paddingTop: 4, paddingBottom: 4 },
      },
    },
    MuiChip: {
      styleOverrides: {
        labelSmall: { fontSize: 11 },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: { fontSize: 13, color: "#0969da" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&.Mui-disabled": {
            backgroundColor: theme.palette.grey[50],
          },
        }),
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: ({ theme }) => ({
          fontSize: 13,
          "&.Mui-disabled": {
            WebkitTextFillColor: theme.palette.text.disabled,
          },
        }),
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: { fontSize: 13 },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&.Mui-disabled": {
            color: theme.palette.text.disabled,
          },
        }),
      },
    },
  },
});
