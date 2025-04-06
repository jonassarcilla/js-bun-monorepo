"use client";
import { scan } from "react-scan";
import { JSX, useEffect } from "react";

const ReactScan = (): JSX.Element => {
    useEffect(() => {
        scan({
            enabled: process.env.NODE_ENV === 'development',
        })
    });

    return <></>;
}

ReactScan.displayName = "Connvey.ReactScan";

export { ReactScan };