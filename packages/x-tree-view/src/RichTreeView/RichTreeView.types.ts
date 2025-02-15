import * as React from 'react';
import { Theme } from '@mui/material/styles';
import { SxProps } from '@mui/system';
import { SlotComponentProps } from '@mui/utils';
import { SlotComponentPropsFromProps } from '@mui/x-internals/types';
import { RichTreeViewClasses } from './richTreeViewClasses';
import {
  RichTreeViewPluginParameters,
  RichTreeViewPluginSlotProps,
  RichTreeViewPluginSlots,
  RichTreeViewPluginSignatures,
} from './RichTreeView.plugins';
import { TreeItemProps } from '../TreeItem';
import { TreeViewItemId } from '../models';
import { TreeViewExperimentalFeatures, TreeViewPublicAPI } from '../internals/models';

interface RichTreeViewItemSlotOwnerState {
  itemId: TreeViewItemId;
  label: string;
}

export interface RichTreeViewSlots extends RichTreeViewPluginSlots {
  /**
   * Element rendered at the root.
   * @default RichTreeViewRoot
   */
  root?: React.ElementType;
  /**
   * Custom component for the item.
   * @default TreeItem.
   */
  item?: React.JSXElementConstructor<TreeItemProps>;
}

export interface RichTreeViewSlotProps<R extends {}, Multiple extends boolean | undefined>
  extends RichTreeViewPluginSlotProps {
  root?: SlotComponentProps<'ul', {}, RichTreeViewProps<R, Multiple>>;
  item?: SlotComponentPropsFromProps<TreeItemProps, {}, RichTreeViewItemSlotOwnerState>;
}

export type RichTreeViewApiRef = React.MutableRefObject<
  TreeViewPublicAPI<RichTreeViewPluginSignatures> | undefined
>;

export interface RichTreeViewPropsBase extends React.HTMLAttributes<HTMLUListElement> {
  className?: string;
  /**
   * Override or extend the styles applied to the component.
   */
  classes?: Partial<RichTreeViewClasses>;
  /**
   * The system prop that allows defining system overrides as well as additional CSS styles.
   */
  sx?: SxProps<Theme>;
}

export interface RichTreeViewProps<R extends {}, Multiple extends boolean | undefined>
  extends RichTreeViewPluginParameters<R, Multiple>,
    RichTreeViewPropsBase {
  /**
   * Overridable component slots.
   * @default {}
   */
  slots?: RichTreeViewSlots;
  /**
   * The props used for each component slot.
   * @default {}
   */
  slotProps?: RichTreeViewSlotProps<R, Multiple>;
  /**
   * The ref object that allows Tree View manipulation. Can be instantiated with `useTreeViewApiRef()`.
   */
  apiRef?: RichTreeViewApiRef;
  /**
   * Unstable features, breaking changes might be introduced.
   * For each feature, if the flag is not explicitly set to `true`,
   * the feature will be fully disabled and any property / method call will not have any effect.
   */
  experimentalFeatures?: TreeViewExperimentalFeatures<RichTreeViewPluginSignatures>;
}
