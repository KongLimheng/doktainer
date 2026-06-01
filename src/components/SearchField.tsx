import { Search } from "lucide-react";
import type { ChangeEventHandler, CSSProperties } from "react";

type SearchFieldProps = {
  placeholder: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  containerStyle?: CSSProperties;
  inputStyle?: CSSProperties;
  autoComplete?: string;
};

export default function SearchField({
  placeholder,
  value,
  onChange,
  containerStyle,
  inputStyle,
  autoComplete = "off",
}: SearchFieldProps) {
  return (
    <div
      style={{
        position: "relative",
        flex: "1 1 320px",
        minWidth: 220,
        ...containerStyle,
      }}
    >
      <Search
        size={13}
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-muted)",
          pointerEvents: "none",
        }}
      />
      <input
        className="input"
        type="text"
        name="panel-search-field"
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          paddingLeft: 30,
          width: "100%",
          ...inputStyle,
        }}
      />
    </div>
  );
}
