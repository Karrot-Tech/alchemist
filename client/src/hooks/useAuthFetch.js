import { useAuth } from "@clerk/clerk-react";
import { useCallback } from "react";

export const useAuthFetch = () => {
    const { getToken } = useAuth();

    const authFetch = useCallback(async (input, init) => {
        const token = await getToken();

        // Ensure headers object exists
        const headers = new Headers(init?.headers || {});

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        const config = {
            ...init,
            headers
        };

        return fetch(input, config);
    }, [getToken]);

    return authFetch;
};
