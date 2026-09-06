// Component for displaying individual archive entries
// Receives props: title, contributor, place, description, and image
export default function EntryCard({ title, contributor, place, description, image }) {
  // Styles for different parts of the card
  const cardStyle = {
    marginBottom: 24,
    padding: 20,
    backgroundColor: "#1C222C",
    border: "1px solid #2E3644",
    borderRadius: 10,
  };

  const labelStyle = {
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    color: "#97A1B3",
    marginBottom: 6,
  };

  const valueStyle = {
    fontSize: 16,
    lineHeight: 1.6,
    marginBottom: 16,
  };

  const descriptionStyle = {
    fontSize: 16,
    lineHeight: 1.6,
    color: "#E0E0E0",
  };
// NEW: Styles for image container and image element  const imageWrapStyle = {
  const imageWrapStyle = {
    marginBottom: 16,
    overflow: "hidden",
    borderRadius: 8,
    border: "1px solid #2E3644",
    backgroundColor: "#0F141A",
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