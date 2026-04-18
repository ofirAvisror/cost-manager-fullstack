/**
 * Matches MUI default Toolbar heights (theme.mixins.toolbar) so fixed AppBar,
 * clipped Drawer paper, and main content share the same vertical offset.
 */

export function drawerPaperBelowAppBar(theme) {
  return {
    top: 56,
    height: 'calc(100vh - 56px)',
    [theme.breakpoints.up('sm')]: {
      top: 64,
      height: 'calc(100vh - 64px)',
    },
    '@media (orientation: landscape)': {
      [theme.breakpoints.down('sm')]: {
        top: 48,
        height: 'calc(100vh - 48px)',
      },
    },
  };
}

export function mainBelowAppBar(theme) {
  return {
    mt: 56,
    minHeight: 'calc(100vh - 56px)',
    [theme.breakpoints.up('sm')]: {
      mt: 64,
      minHeight: 'calc(100vh - 64px)',
    },
    '@media (orientation: landscape)': {
      [theme.breakpoints.down('sm')]: {
        mt: 48,
        minHeight: 'calc(100vh - 48px)',
      },
    },
  };
}
