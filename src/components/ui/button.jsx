import * as React from "react"
import { styled } from "@mui/material/styles"
import Button as MuiButton from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"

const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) => prop !== "size" && prop !== "variant",
})(({ theme, size, variant }) => ({
  borderRadius: theme.shape.borderRadius,
  textTransform: "none",
  fontWeight: theme.typography.fontWeightMedium,
  fontSize: theme.typography.body2.fontSize,
  transition: theme.transitions.create(["background-color", "box-shadow", "border-color"]),
  "&:focus-visible": {
    outline: "none",
    ring: `2px solid ${theme.palette.primary.main}`,
    ringOffset: "2px",
  },
  "&:disabled": {
    pointerEvents: "none",
    opacity: 0.5,
  },
  ...(variant === "default" && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
  }),
  ...(variant === "destructive" && {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.error.dark,
    },
  }),
  ...(variant === "outline" && {
    backgroundColor: "transparent",
    border: `1px solid ${theme.palette.divider}`,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  }),
  ...(variant === "secondary" && {
    backgroundColor: theme.palette.secondary.main,
    color: theme.palette.secondary.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.secondary.dark,
    },
  }),
  ...(variant === "ghost" && {
    backgroundColor: "transparent",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  }),
  ...(size === "default" && {
    padding: theme.spacing(1, 2),
    height: 40,
  }),
  ...(size === "sm" && {
    padding: theme.spacing(0.75, 1.5),
    height: 36,
  }),
  ...(size === "lg" && {
    padding: theme.spacing(1.5, 4),
    height: 44,
  }),
}))

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  width: 36,
  height: 36,
  padding: theme.spacing(1),
}))

const Button = React.forwardRef(({ 
  className,
  variant = "default",
  size = "default",
  children,
  ...props 
}, ref) => {
  if (size === "icon") {
    return (
      <StyledIconButton
        ref={ref}
        className={className}
        {...props}
      >
        {children}
      </StyledIconButton>
    )
  }

  return (
    <StyledButton
      ref={ref}
      className={className}
      variant={variant === "default" ? "contained" : variant}
      size={size}
      {...props}
    >
      {children}
    </StyledButton>
  )
})

Button.displayName = "Button"

export { Button }
