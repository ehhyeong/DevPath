export function StarRating({
  rating,
  className = "text-xs",
}: {
  rating: number;
  className?: string;
}) {
  const whole = Math.floor(rating);
  const hasHalf = rating - whole >= 0.5;
  return (
    <div className={`flex text-yellow-400 ${className}`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starIndex = index + 1;
        const iconClassName =
          starIndex <= whole
            ? "fas fa-star"
            : starIndex === whole + 1 && hasHalf
              ? "fas fa-star-half-alt"
              : "far fa-star";
        return <i key={index} className={iconClassName} />;
      })}
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#00c471] border-t-transparent" />
    </div>
  );
}

const markdownImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;

export function CourseDescription({ description }: { description: string }) {
  const nodes: Array<
    | { type: "text"; value: string }
    | { type: "image"; alt: string; src: string }
  > = [];
  let lastIndex = 0;

  for (const match of description.matchAll(markdownImagePattern)) {
    const matchIndex = match.index ?? 0;
    const textBefore = description.slice(lastIndex, matchIndex).trim();

    if (textBefore) {
      nodes.push({ type: "text", value: textBefore });
    }

    nodes.push({
      type: "image",
      alt: match[1] || "강의 소개 이미지",
      src: match[2],
    });
    lastIndex = matchIndex + match[0].length;
  }

  const textAfter = description.slice(lastIndex).trim();
  if (textAfter) {
    nodes.push({ type: "text", value: textAfter });
  }

  if (!nodes.length) {
    return <p className="mb-4">{description}</p>;
  }

  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === "image") {
          return (
            <img
              key={`course-description-image-${index}`}
              src={node.src}
              alt={node.alt}
              className="my-6 w-full rounded-xl border border-gray-100 object-cover"
            />
          );
        }

        return node.value.split(/\n{2,}/).map((paragraph, paragraphIndex) => (
          <p
            key={`course-description-text-${index}-${paragraphIndex}`}
            className="mb-4 whitespace-pre-line"
          >
            {paragraph}
          </p>
        ));
      })}
    </>
  );
}
