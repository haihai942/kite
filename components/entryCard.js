// Component for displaying individual archive entries
// Receives props: title, contributor, place, description, and image
export default function EntryCard({ title, contributor, place, description, image }) {
  // Styles for different parts of the card
  const cardStyle = {
    marginBottom: 24,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 10,
  };

  const labelStyle = {
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: 600,
    marginBottom: 6,
  };

  const valueStyle = {
    fontSize: 16,
    lineHeight: 1.6,
    marginBottom: 16,
    color: "#1E3A8A",
  };

  const descriptionStyle = {
    fontSize: 16,
    lineHeight: 1.6,
    color: "#1E3A8A",
  };

  const imageWrapStyle = {
    marginBottom: 16,
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
    maxHeight: 320,
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