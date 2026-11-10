// Component for displaying individual archive entries
// Receives props: title, contributor, place, description, and image
export default function EntryCard({ title, contributor, place, description, image }) {
  // Styles for different parts of the card
  const cardStyle = {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 10,
    boxSizing: "border-box",
    height: "100%",
  };

  const labelStyle = {
    fontFamily: "'Courier New', monospace",
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: 600,
    marginBottom: 4,
  };

  const valueStyle = {
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 10,
    color: "#1E3A8A",
    wordBreak: "break-word",
  };

  const descriptionStyle = {
    fontSize: 13,
    lineHeight: 1.5,
    color: "#1E3A8A",
    wordBreak: "break-word",
  };

  const imageWrapStyle = {
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    backgroundColor: "#F1F5F9",
  };

  const imageStyle = {
    display: "block",
    width: "100%",
    height: "auto",
    maxHeight: 150,
    objectFit: "cover",
  };

  return (
    <div style={cardStyle}>
      {image ? (
        <div style={imageWrapStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={title ? `Image for ${title}` : "Entry image"}
            loading="lazy"
            style={imageStyle}
          />
        </div>
      ) : null}

      <p style={labelStyle}>TITLE</p>
      <p style={valueStyle}>{title}</p>

      <p style={labelStyle}>CONTRIBUTOR</p>
      <p style={valueStyle}>{contributor}</p>

      <p style={labelStyle}>PLACE</p>
      <p style={valueStyle}>{place}</p>

      <p style={labelStyle}>DESCRIPTION</p>
      <p style={descriptionStyle}>{description}</p>
    </div>
  );
}