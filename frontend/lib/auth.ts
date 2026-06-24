
export function getToken() {

    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem("token");
}

export function logout() {

    localStorage.removeItem("token");

    window.location.href = "/login";
}

export function getUser() {
    if (typeof window === "undefined") return null;

    const user = localStorage.getItem("user");

    return user ? JSON.parse(user) : null;
}

export function isOwner() {
    const user = getUser();

    return user?.role === "OWNER";
}

export function isEmployee() {
    const user = getUser();

    return user?.role === "EMPLOYEE";
}