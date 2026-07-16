//pure function that turns raw bytes into a human label at display time only 
export function formatBytes(bytes: number): string {
    const gb = (bytes/1024** 3)
    if (gb >= 1) return `${gb.toFixed(1)} GB` // if the number of bytes is greater than or equal to 1 GB, return the number of GB with one decimal place
    return `${(bytes / 1024 ** 2).toFixed(0)} MB`
}


