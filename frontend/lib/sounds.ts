export function playBeep() {
    const audio = new Audio("/beep.mp3");
    audio.volume = 0.4;
    audio.play();
}