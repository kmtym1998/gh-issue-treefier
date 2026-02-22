import { Divider, ListSubheader, Menu, MenuItem } from "@mui/material";

export interface PaneContextMenuProps {
  anchorPosition: { x: number; y: number } | null;
  open: boolean;
  onClose: () => void;
  onCreateIssue: () => void;
  onAddIssue: () => void;
  onAddPR: () => void;
}

export function PaneContextMenu({
  anchorPosition,
  open,
  onClose,
  onCreateIssue,
  onAddIssue,
  onAddPR,
}: PaneContextMenuProps) {
  const handle = (cb: () => void) => () => {
    cb();
    onClose();
  };

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        anchorPosition
          ? { top: anchorPosition.y, left: anchorPosition.x }
          : undefined
      }
      slotProps={{ list: { dense: true, sx: { fontSize: 12 } } }}
    >
      <ListSubheader
        sx={{ fontSize: 11, lineHeight: "28px", bgcolor: "transparent" }}
      >
        新規作成
      </ListSubheader>
      <MenuItem sx={{ fontSize: 12 }} onClick={handle(onCreateIssue)}>
        Issue を作成
      </MenuItem>
      <Divider />
      <ListSubheader
        sx={{ fontSize: 11, lineHeight: "28px", bgcolor: "transparent" }}
      >
        既存を追加
      </ListSubheader>
      <MenuItem sx={{ fontSize: 12 }} onClick={handle(onAddIssue)}>
        Issue を追加
      </MenuItem>
      <MenuItem sx={{ fontSize: 12 }} onClick={handle(onAddPR)}>
        PR を追加
      </MenuItem>
    </Menu>
  );
}
