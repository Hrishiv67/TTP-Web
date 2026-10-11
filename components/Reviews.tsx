import { REVIEWS } from "@/lib/business";

export function Reviews() {
  return (
    <section className="reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="wrap reviews__inner">
        <div className="reviews__score">
          <p className="reviews__number" aria-hidden="true">
            {REVIEWS.rating}
          </p>
          <div className="reviews__meta">
            <h2 className="sr-only" id="reviews-title">
              Rated {REVIEWS.rating} out of 5 from {REVIEWS.count} reviews
            </h2>
            <p className="reviews__stars" aria-hidden="true">
              ★★★★★
            </p>
            <p className="label">Out of 5</p>
            <p className="label">{REVIEWS.count} reviews</p>
          </div>
        </div>
        <div className="reviews__themes">
          <p className="label">What customers bring up most</p>
          <ul>
            {REVIEWS.themes.map((t) => (
              <li className="display-m" key={t}>
                {t}
              </li>
            ))}
          </ul>
          <div className="reviews__foot">
            <a className="link link--paper" href={REVIEWS.url} target="_blank" rel="noopener noreferrer">
              Read the reviews on Google <span aria-hidden="true">↗</span>
            </a>
            <p className="label-s">Rating as listed online, {REVIEWS.asOf}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
