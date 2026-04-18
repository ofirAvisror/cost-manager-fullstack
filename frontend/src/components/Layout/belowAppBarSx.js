/**
 * Matches MUI default Toolbar heights (theme.mixins.toolbar) so clipped Drawer
 * paper aligns with the fixed AppBar.
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
