import { REVIEWS } from "@/lib/business";
import { COPY } from "@/lib/copy";

export function Reviews() {
  const { heading, ratingLine, mentions, link, asOf } = COPY.reviews;
  return (
    <section className="section" id="reviews" aria-labelledby="reviews-title">
      <div className="wrap">
        <h2 className="sr-only" id="reviews-title">
          {heading}
        </h2>
        <div className="reviews">
          <p className="reviews__score" aria-hidden="true">
            {REVIEWS.rating}
          </p>
          <div className="reviews__body">
            <p className="t-h3">{ratingLine}</p>
            <p className="t-lede">{mentions}</p>
            <p>
              <a className="link" href={REVIEWS.url} target="_blank" rel="noopener noreferrer">
                {link}
              </a>
            </p>
            <p className="t-small">{asOf}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
