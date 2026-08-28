function MarkBase({ size = 18, color = "currentColor", children, style = {}, viewBox = "0 0 24 24" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      style={{ display: "block", flexShrink: 0, color, ...style }}
    >
      {children}
    </svg>
  );
}

const strokeProps = {
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function CheckMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="m5.2 12.7 4.1 4.2 9.5-9.7" /></MarkBase>;
}

export function StarMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="m12 4.1 2.2 5.2 5.5.5-4.2 3.5 1.3 5.4-4.8-2.9-4.8 2.9 1.3-5.4-4.2-3.5 5.5-.5L12 4.1Z" /></MarkBase>;
}

export function AsteriskMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12 4.2v15.6M5.7 8.1l12.6 7.8M18.1 7.7 5.9 16.3" /></MarkBase>;
}

export function HeartMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12 20c-2-1.7-7.5-5.4-8.4-9-.7-2.8 1.2-5.1 3.8-5 2 0 3.6 1.3 4.6 3 1-1.7 2.6-3 4.6-3 2.6-.1 4.5 2.2 3.8 5-.9 3.6-6.4 7.3-8.4 9Z" /></MarkBase>;
}

export function WaveMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M3.3 13.1c2.3-2.8 4.3-2.8 6.3 0 2 2.8 4 2.8 6 0 1.8-2.5 3.6-2.7 5.1-.8" /></MarkBase>;
}

export function SproutMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12 20V9.7M11.9 12.3c-3.6.1-6.1-1.4-7-4.6 3.7-.5 6.2.8 7 4.6ZM12.1 15.3c3.4-.1 5.8-1.6 6.7-4.6-3.2-.5-5.7.8-6.7 4.6Z" /></MarkBase>;
}

export function SunMark(props) {
  return <MarkBase {...props}><circle {...strokeProps} cx="12" cy="12" r="3.6" /><path {...strokeProps} d="M12 3.2v2.4M12 18.4v2.4M3.2 12h2.4M18.4 12h2.4M5.8 5.8l1.7 1.7M16.5 16.5l1.7 1.7M18.2 5.8l-1.7 1.7M7.5 16.5l-1.7 1.7" /></MarkBase>;
}

export function ArrowMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12 19V5M7.4 9.6 12 5l4.6 4.6" /></MarkBase>;
}

export function FlowerMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12 10.1c-1.7-3.8-.6-6 1.5-5.6 1.9.4 2 2.9.6 5 3.3-2.2 5.7-1.2 5.4 1-.3 2-2.6 2.6-4.8 1.6 2.7 2.7 2.1 5.3-.2 5.5-2 .2-3-2-2.5-4.2-2.5 3-5.1 2.6-5.5.4-.3-2 1.8-3.2 4-3.1-2.9-2.2-2.7-4.7-.6-5.1 1.9-.3 3.1 1.8 2.1 4.5Z" /></MarkBase>;
}

export function MoonMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M16.7 4.7a7.6 7.6 0 1 0 2.6 12.9 7.3 7.3 0 0 1-6.5-7.3 7.5 7.5 0 0 1 3.9-5.6Z" /></MarkBase>;
}

export function BoltMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="m14.2 3.7-7 9h4.3l-1.6 7.6 7-9h-4.2l1.5-7.6Z" /></MarkBase>;
}

export function SpiralMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12 12.1c.8-1.2 2.7-.9 3 .5.4 1.9-1.6 3.6-3.7 3.3-2.9-.4-4.3-3.6-2.7-6 2-3 6.8-3.1 9-.3 2.7 3.5.3 8.6-4.1 9.7-5.5 1.3-10.1-3.5-8.9-8.9" /></MarkBase>;
}

export function ArchMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M5 18.5c.3-6.7 2.7-11 7-12.9 4.3 1.9 6.7 6.2 7 12.9M8.3 18.5c.2-4.7 1.5-7.8 3.7-9.3 2.2 1.5 3.5 4.6 3.7 9.3" /></MarkBase>;
}


export function SparkleMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12 3.8c.2 3 .8 5.1 2 6.2 1.1 1.1 3.2 1.8 6.1 2-2.9.2-5 .9-6.1 2-1.2 1.1-1.8 3.2-2 6.2-.2-3-.8-5.1-2-6.2-1.1-1.1-3.2-1.8-6.1-2 2.9-.2 5-.9 6.1-2 1.2-1.1 1.8-3.2 2-6.2Z" /></MarkBase>;
}

export const WITHMARK_OPTIONS = [
  { id: "check", name: "Check", Component: CheckMark },
  { id: "star", name: "Star", Component: StarMark },
  { id: "asterisk", name: "Asterisk", Component: AsteriskMark },
  { id: "heart", name: "Heart", Component: HeartMark },
  { id: "wave", name: "Wave", Component: WaveMark },
  { id: "sprout", name: "Sprout", Component: SproutMark },
  { id: "sun", name: "Sun", Component: SunMark },
  { id: "arrow", name: "Arrow", Component: ArrowMark },
  { id: "flower", name: "Flower", Component: FlowerMark },
  { id: "moon", name: "Moon", Component: MoonMark },
  { id: "bolt", name: "Bolt", Component: BoltMark },
  { id: "spiral", name: "Spiral", Component: SpiralMark },
  { id: "arch", name: "Arch", Component: ArchMark },
  { id: "sparkle", name: "Sparkle", Component: SparkleMark },
];

export function WithMark({ id = "star", ...props }) {
  const option = WITHMARK_OPTIONS.find((item) => item.id === id) || WITHMARK_OPTIONS[1];
  const Component = option.Component;
  return <Component {...props} />;
}
