function MarkBase({ size = 18, color = "currentColor", children, style = {}, viewBox = "0 0 24 24" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      style={{ display: "inline-block", flexShrink: 0, color, ...style }}
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

export function StarMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12.1 3.4c.1 3.6.7 6.2 2.1 7.6 1.3 1.3 3.7 1.8 6.4 2-2.8.2-5.1.8-6.4 2.2-1.4 1.5-1.9 3.8-2.1 6.1-.2-2.5-.8-4.8-2.2-6.2-1.3-1.3-3.5-1.9-6.4-2.1 2.8-.2 5-.7 6.4-2.1 1.4-1.4 2-3.9 2.2-7.5Z" /></MarkBase>;
}

export function AsteriskMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12.1 4.2 12 19.7M5.6 8.1l12.8 7.8M18.2 7.5 5.8 16.4" /></MarkBase>;
}

export function HeartMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12 20.1c-1.7-1.4-6.7-5.1-8.2-8.1-1-2-.3-4.6 1.7-5.7 2.1-1.1 4.3-.1 5.5 1.7 1.2-1.9 3.5-2.9 5.7-1.7 2 1.1 2.7 3.7 1.6 5.7-1.6 3.1-6.3 6.7-8.3 8.1Z" /></MarkBase>;
}

export function WaveMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M3.4 13.1c2.1-3 4.1-3.1 6.1-.1 1.9 2.8 3.9 2.9 5.9 0 1.9-2.7 3.6-2.9 5.2-.7" /></MarkBase>;
}

export function CheckMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="m5.2 12.9 4.2 4.1L19 7.2" /><path {...strokeProps} d="M4.2 5.6c2.4-1.8 5.5-2.4 8.6-1.7 3 .6 5.3 2.4 6.7 4.8" opacity=".5" /></MarkBase>;
}

export function SproutMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12 20.2c.2-5.4.2-9.2-.2-12.1" /><path {...strokeProps} d="M11.8 11.4c-3.5.1-6-1.4-6.9-4.6 3.5-.6 6.2.7 6.9 4.6Z" /><path {...strokeProps} d="M12.1 14.7c3.3-.1 5.7-1.6 6.5-4.5-3.1-.5-5.6.8-6.5 4.5Z" /></MarkBase>;
}

export function SunMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12.1 8.3c2.2 0 3.8 1.6 3.8 3.7 0 2.3-1.6 3.9-3.9 3.9-2.2 0-3.8-1.7-3.8-3.9 0-2.1 1.6-3.7 3.9-3.7Z" /><path {...strokeProps} d="M12 3.3v2.3M12 18.4v2.3M3.5 12h2.4M18.3 12h2.2M5.8 5.8l1.7 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.7" /></MarkBase>;
}

export function ArrowMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M5 17.8c4.8-.4 8.7-3.3 12.4-9.2" /><path {...strokeProps} d="m12.9 8.7 5.2-.8-.5 5.1" /></MarkBase>;
}

export function FlowerMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12 10.1c-1.8-4.2-.4-6.4 1.8-5.7 1.9.6 1.7 3.2.2 5 3.6-2.4 6-1.1 5.4 1.3-.5 2-3 2.3-5.1 1.2 2.9 3.1 2 5.8-.5 5.6-2-.2-2.8-2.5-2.2-4.7-2.7 3.2-5.5 2.6-5.6.2-.1-2.2 2.2-3.3 4.4-3-3.1-2.5-2.7-5.1-.4-5.3 2-.2 3 2.1 2 5.4Z" /></MarkBase>;
}

export function MoonMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M16.9 4.7c-1.1 1.1-1.8 2.7-1.8 4.4 0 3.6 2.9 6.5 6.4 6.5-1.6 2.8-4.4 4.5-7.6 4.5-4.8 0-8.7-3.8-8.7-8.6 0-4.2 3.1-7.8 7.2-8.5 1.6-.3 3.2.1 4.5 1.7Z" /></MarkBase>;
}

export function BoltMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M13.8 3.7 7.4 12h4.2l-1.2 8.3 6.4-9.1h-4.1l1.1-7.5Z" /></MarkBase>;
}

export function SpiralMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M12.1 12c.8-1.1 2.5-.9 2.8.4.4 1.8-1.5 3.5-3.5 3.2-2.8-.4-4.1-3.5-2.6-5.8 1.9-2.9 6.6-3 8.7-.3 2.6 3.4.3 8.4-4 9.4-5.3 1.2-9.8-3.4-8.6-8.6" /></MarkBase>;
}

export function ArchMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M5 18.4c.3-6.5 2.7-10.7 7-12.6 4.2 1.9 6.6 6.1 7 12.6M8.1 18.4c.2-4.6 1.5-7.7 3.9-9.1 2.4 1.4 3.7 4.5 3.9 9.1" /></MarkBase>;
}

export function BirdMark(props) {
  return <MarkBase {...props}><path {...strokeProps} d="M4.2 14.3c2.4-3.1 5.1-3.4 7.8-.8 2.6-2.7 5.2-2.5 7.8.5M12 13.5c-.7 2.3-.8 4.2-.2 6" /></MarkBase>;
}

export const WITHMARK_OPTIONS = [
  { id: "star", name: "Star", Component: StarMark },
  { id: "heart", name: "Heart", Component: HeartMark },
  { id: "sprout", name: "Sprout", Component: SproutMark },
  { id: "sun", name: "Sun", Component: SunMark },
  { id: "wave", name: "Wave", Component: WaveMark },
  { id: "asterisk", name: "Asterisk", Component: AsteriskMark },
  { id: "flower", name: "Flower", Component: FlowerMark },
  { id: "moon", name: "Moon", Component: MoonMark },
  { id: "bolt", name: "Bolt", Component: BoltMark },
  { id: "spiral", name: "Spiral", Component: SpiralMark },
  { id: "arch", name: "Arch", Component: ArchMark },
  { id: "bird", name: "Bird", Component: BirdMark },
  { id: "arrow", name: "Arrow", Component: ArrowMark },
  { id: "check", name: "Check", Component: CheckMark },
];

export function WithMark({ id = "star", ...props }) {
  const option = WITHMARK_OPTIONS.find((item) => item.id === id) || WITHMARK_OPTIONS[0];
  const Component = option.Component;
  return <Component {...props} />;
}
