import React from 'react';
import { Drawer } from 'vaul';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

interface MobileBottomPanelProps {
    children: React.ReactNode;
    onClose: () => void;
    showDragHandle?: boolean;
    modal?: boolean;
}

export const MobileBottomPanel: React.FC<MobileBottomPanelProps> = ({
    children,
    onClose,
    showDragHandle = true,
    modal = false
}) => {
    return (
        <Drawer.Root
            open
            onOpenChange={(open) => !open && onClose()}
            dismissible={true}
            modal={modal}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="drawer-overlay" />
                <Drawer.Content className="drawer-content">
                    {/* Accessibility titles (visually hidden to preserve design) */}
                    <VisuallyHidden.Root>
                        <Drawer.Title>Panel</Drawer.Title>
                        <Drawer.Description>Swipe down to dismiss.</Drawer.Description>
                    </VisuallyHidden.Root>

                    {/* Vaul's native drag handle for proper gesture tracking */}
                    {showDragHandle && (
                        <div className="drawer-handle-container">
                            <Drawer.Handle className="drag-handle-pill" />
                        </div>
                    )}
                    <div className="drawer-inner" data-vaul-scrollable>
                        {children}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
};

export default MobileBottomPanel;
