import * as React from 'react';
import { TreeViewPlugin } from '../../models';
import { TreeViewItemId } from '../../../models';
import {
  findOrderInTremauxTree,
  getAllNavigableItems,
  getFirstNavigableItem,
  getLastNavigableItem,
  getNonDisabledItemsInRange,
} from '../../utils/tree';
import {
  UseTreeViewSelectionInstance,
  UseTreeViewSelectionSignature,
} from './useTreeViewSelection.types';
import {
  convertSelectedItemsToArray,
  propagateSelection,
  getAddedAndRemovedItems,
  getLookupFromArray,
} from './useTreeViewSelection.utils';
import { useTreeViewSelectionItemPlugin } from './useTreeViewSelection.itemPlugin';

export const useTreeViewSelection: TreeViewPlugin<UseTreeViewSelectionSignature> = ({
  instance,
  params,
  models,
}) => {
  const lastSelectedItem = React.useRef<string | null>(null);
  const lastSelectedRange = React.useRef<{ [itemId: string]: boolean }>({});

  const selectedItemsMap = React.useMemo(() => {
    const temp = new Map<TreeViewItemId, boolean>();
    if (Array.isArray(models.selectedItems.value)) {
      models.selectedItems.value.forEach((id) => {
        temp.set(id, true);
      });
    } else if (models.selectedItems.value != null) {
      temp.set(models.selectedItems.value, true);
    }

    return temp;
  }, [models.selectedItems.value]);

  const setSelectedItems = (
    event: React.SyntheticEvent,
    newModel: typeof params.defaultSelectedItems,
    additionalItemsToPropagate?: TreeViewItemId[],
  ) => {
    let cleanModel: typeof newModel;

    if (
      params.multiSelect &&
      (params.selectionPropagation.descendants || params.selectionPropagation.parents)
    ) {
      cleanModel = propagateSelection({
        instance,
        selectionPropagation: params.selectionPropagation,
        newModel: newModel as string[],
        oldModel: models.selectedItems.value as string[],
        additionalItemsToPropagate,
      });
    } else {
      cleanModel = newModel;
    }

    if (params.onItemSelectionToggle) {
      if (params.multiSelect) {
        const changes = getAddedAndRemovedItems({
          instance,
          newModel: cleanModel as string[],
          oldModel: models.selectedItems.value as string[],
        });

        if (params.onItemSelectionToggle) {
          changes.added.forEach((itemId) => {
            params.onItemSelectionToggle!(event, itemId, true);
          });

          changes.removed.forEach((itemId) => {
            params.onItemSelectionToggle!(event, itemId, false);
          });
        }
      } else if (params.onItemSelectionToggle && cleanModel !== models.selectedItems.value) {
        if (models.selectedItems.value != null) {
          params.onItemSelectionToggle(event, models.selectedItems.value as string, false);
        }
        if (cleanModel != null) {
          params.onItemSelectionToggle(event, cleanModel as string, true);
        }
      }
    }

    if (params.onSelectedItemsChange) {
      params.onSelectedItemsChange(event, cleanModel);
    }

    models.selectedItems.setControlledValue(cleanModel);
  };

  const isItemSelected = (itemId: string) => selectedItemsMap.has(itemId);

  const selectItem: UseTreeViewSelectionInstance['selectItem'] = ({
    event,
    itemId,
    keepExistingSelection = false,
    shouldBeSelected,
  }) => {
    if (params.disableSelection) {
      return;
    }

    let newSelected: typeof models.selectedItems.value;
    if (keepExistingSelection) {
      const cleanSelectedItems = convertSelectedItemsToArray(models.selectedItems.value);
      const isSelectedBefore = instance.isItemSelected(itemId);
      if (isSelectedBefore && (shouldBeSelected === false || shouldBeSelected == null)) {
        newSelected = cleanSelectedItems.filter((id) => id !== itemId);
      } else if (!isSelectedBefore && (shouldBeSelected === true || shouldBeSelected == null)) {
        newSelected = [itemId].concat(cleanSelectedItems);
      } else {
        newSelected = cleanSelectedItems;
      }
    } else {
      // eslint-disable-next-line no-lonely-if
      if (
        shouldBeSelected === false ||
        (shouldBeSelected == null && instance.isItemSelected(itemId))
      ) {
        newSelected = params.multiSelect ? [] : null;
      } else {
        newSelected = params.multiSelect ? [itemId] : itemId;
      }
    }

    setSelectedItems(
      event,
      newSelected,
      // If shouldBeSelected === instance.isItemSelect(itemId), we still want to propagate the select.
      // This is useful when the element is in an indeterminate state.
      [itemId],
    );
    lastSelectedItem.current = itemId;
    lastSelectedRange.current = {};
  };

  const selectRange = (event: React.SyntheticEvent, [start, end]: [string, string]) => {
    if (params.disableSelection || !params.multiSelect) {
      return;
    }

    let newSelectedItems = convertSelectedItemsToArray(models.selectedItems.value).slice();

    // If the last selection was a range selection,
    // remove the items that were part of the last range from the model
    if (Object.keys(lastSelectedRange.current).length > 0) {
      newSelectedItems = newSelectedItems.filter((id) => !lastSelectedRange.current[id]);
    }

    // Add to the model the items that are part of the new range and not already part of the model.
    const selectedItemsLookup = getLookupFromArray(newSelectedItems);
    const range = getNonDisabledItemsInRange(instance, start, end);
    const itemsToAddToModel = range.filter((id) => !selectedItemsLookup[id]);
    newSelectedItems = newSelectedItems.concat(itemsToAddToModel);

    setSelectedItems(event, newSelectedItems);
    lastSelectedRange.current = getLookupFromArray(range);
  };

  const expandSelectionRange = (event: React.SyntheticEvent, itemId: string) => {
    if (lastSelectedItem.current != null) {
      const [start, end] = findOrderInTremauxTree(instance, itemId, lastSelectedItem.current);
      selectRange(event, [start, end]);
    }
  };

  const selectRangeFromStartToItem = (event: React.SyntheticEvent, itemId: string) => {
    selectRange(event, [getFirstNavigableItem(instance), itemId]);
  };

  const selectRangeFromItemToEnd = (event: React.SyntheticEvent, itemId: string) => {
    selectRange(event, [itemId, getLastNavigableItem(instance)]);
  };

  const selectAllNavigableItems = (event: React.SyntheticEvent) => {
    if (params.disableSelection || !params.multiSelect) {
      return;
    }

    const navigableItems = getAllNavigableItems(instance);
    setSelectedItems(event, navigableItems);

    lastSelectedRange.current = getLookupFromArray(navigableItems);
  };

  const selectItemFromArrowNavigation = (
    event: React.SyntheticEvent,
    currentItem: string,
    nextItem: string,
  ) => {
    if (params.disableSelection || !params.multiSelect) {
      return;
    }

    let newSelectedItems = convertSelectedItemsToArray(models.selectedItems.value).slice();

    if (Object.keys(lastSelectedRange.current).length === 0) {
      newSelectedItems.push(nextItem);
      lastSelectedRange.current = { [currentItem]: true, [nextItem]: true };
    } else {
      if (!lastSelectedRange.current[currentItem]) {
        lastSelectedRange.current = {};
      }

      if (lastSelectedRange.current[nextItem]) {
        newSelectedItems = newSelectedItems.filter((id) => id !== currentItem);
        delete lastSelectedRange.current[currentItem];
      } else {
        newSelectedItems.push(nextItem);
        lastSelectedRange.current[nextItem] = true;
      }
    }

    setSelectedItems(event, newSelectedItems);
  };

  return {
    getRootProps: () => ({
      'aria-multiselectable': params.multiSelect,
    }),
    publicAPI: {
      selectItem,
    },
    instance: {
      isItemSelected,
      selectItem,
      selectAllNavigableItems,
      expandSelectionRange,
      selectRangeFromStartToItem,
      selectRangeFromItemToEnd,
      selectItemFromArrowNavigation,
    },
    contextValue: {
      selection: {
        multiSelect: params.multiSelect,
        checkboxSelection: params.checkboxSelection,
        disableSelection: params.disableSelection,
        selectionPropagation: params.selectionPropagation,
      },
    },
  };
};

useTreeViewSelection.itemPlugin = useTreeViewSelectionItemPlugin;

useTreeViewSelection.models = {
  selectedItems: {
    getDefaultValue: (params) => params.defaultSelectedItems,
  },
};

const DEFAULT_SELECTED_ITEMS: string[] = [];

useTreeViewSelection.getDefaultizedParams = ({ params }) => ({
  ...params,
  disableSelection: params.disableSelection ?? false,
  multiSelect: params.multiSelect ?? false,
  checkboxSelection: params.checkboxSelection ?? false,
  defaultSelectedItems:
    params.defaultSelectedItems ?? (params.multiSelect ? DEFAULT_SELECTED_ITEMS : null),
  selectionPropagation: params.selectionPropagation ?? {},
});

useTreeViewSelection.params = {
  disableSelection: true,
  multiSelect: true,
  checkboxSelection: true,
  defaultSelectedItems: true,
  selectedItems: true,
  onSelectedItemsChange: true,
  onItemSelectionToggle: true,
  selectionPropagation: true,
};
