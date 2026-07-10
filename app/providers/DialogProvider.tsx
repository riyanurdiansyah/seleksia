"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import ConfirmDialog from "../(admin)/components/ConfirmDialog";

interface DialogContextType {
    alert: (message: string, title?: string) => Promise<void>;
    confirm: (message: string, title?: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error("useDialog must be used within a DialogProvider");
    }
    return context;
};

export const globalDialog = {
    alert: async (message: string, title?: string): Promise<void> => {
        console.warn("globalDialog used before DialogProvider mounted");
        window.alert(message);
    },
    confirm: async (message: string, title?: string): Promise<boolean> => {
        console.warn("globalDialog used before DialogProvider mounted");
        return window.confirm(message);
    }
};

export function DialogProvider({ children }: { children: ReactNode }) {
    const [dialogConfig, setDialogConfig] = useState<{
        open: boolean;
        title: string;
        message: string;
        type: "alert" | "confirm";
        resolve: (value: boolean) => void;
    } | null>(null);

    const alert = useCallback((message: string, title = "Pemberitahuan") => {
        return new Promise<void>((resolve) => {
            setDialogConfig({
                open: true,
                title,
                message,
                type: "alert",
                resolve: () => resolve(),
            });
        });
    }, []);

    const confirm = useCallback((message: string, title = "Konfirmasi") => {
        return new Promise<boolean>((resolve) => {
            setDialogConfig({
                open: true,
                title,
                message,
                type: "confirm",
                resolve,
            });
        });
    }, []);

    React.useEffect(() => {
        globalDialog.alert = alert;
        globalDialog.confirm = confirm;
    }, [alert, confirm]);

    const handleConfirm = () => {
        if (dialogConfig) {
            dialogConfig.resolve(true);
            setDialogConfig(null);
        }
    };

    const handleCancel = () => {
        if (dialogConfig) {
            dialogConfig.resolve(false);
            setDialogConfig(null);
        }
    };

    return (
        <DialogContext.Provider value={{ alert, confirm }}>
            {children}
            {dialogConfig && (
                <ConfirmDialog
                    open={dialogConfig.open}
                    title={dialogConfig.title}
                    message={dialogConfig.message}
                    confirmLabel="OK"
                    cancelLabel={dialogConfig.type === "confirm" ? "Batal" : ""}
                    variant={dialogConfig.type === "confirm" ? "danger" : "warning"}
                    onConfirm={handleConfirm}
                    onCancel={dialogConfig.type === "confirm" ? handleCancel : handleConfirm}
                />
            )}
        </DialogContext.Provider>
    );
}
