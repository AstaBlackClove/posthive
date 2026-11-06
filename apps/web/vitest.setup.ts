// Browser APIs that jsdom lacks and that Radix / cmdk / sonner call. Only runs where there is a
// window (jsdom tests); the node-environment lib tests skip it. Each test file can still replace
// one with vi.stubGlobal (AuthSlider.test does so for matchMedia).
if (typeof window !== "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver ??= ResizeObserverStub;

  // Radix Select
  const proto = window.HTMLElement.prototype;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};

  // Radix Select, cmdk
  proto.scrollIntoView ??= () => {};

  // sonner, Sidebar, CalendarView
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
