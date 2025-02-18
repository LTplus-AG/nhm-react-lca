import * as React from "react";
import { styled } from "@mui/material/styles";
import TextField from "@mui/material/TextField";

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiInputBase-root": {
    height: 40,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    fontSize: theme.typography.body2.fontSize,
    transition: theme.transitions.create([
      "border-color",
      "background-color",
      "box-shadow",
    ]),
    "&:hover": {
      borderColor: theme.palette.text.primary,
    },
    "&.Mui-focused": {
      boxShadow: `${theme.palette.primary.main} 0 0 0 2px`,
      borderColor: theme.palette.primary.main,
    },
    "&.Mui-disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1.5),
    "&::placeholder": {
      color: theme.palette.text.secondary,
      opacity: 1,
    },
  },
}));

const Input = React.forwardRef(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <StyledTextField
        type={type}
        variant="outlined"
        fullWidth
        inputRef={ref}
        className={className}
        InputProps={{
          ...props,
        }}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
