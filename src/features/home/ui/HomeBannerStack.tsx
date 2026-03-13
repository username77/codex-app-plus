import type { UiBanner } from "../../../domain/types";

const MAX_VISIBLE_BANNERS = 3;

interface HomeBannerStackProps {
  readonly banners: ReadonlyArray<UiBanner>;
  readonly onDismissBanner: (bannerId: string) => void;
}

export function selectVisibleHomeBanners(
  banners: ReadonlyArray<UiBanner>,
): ReadonlyArray<UiBanner> {
  return banners
    .filter((banner) => banner.level !== "info")
    .slice(0, MAX_VISIBLE_BANNERS);
}

export function HomeBannerStack(props: HomeBannerStackProps): JSX.Element | null {
  if (props.banners.length === 0) {
    return null;
  }

  return (
    <section className="home-banner-stack" aria-label="重要通知">
      {props.banners.map((banner) => (
        <article
          key={banner.id}
          className={createBannerClassName(banner.level)}
          role="alert"
        >
          <div className="home-banner-copy">
            <strong className="home-banner-title">{banner.title}</strong>
            {banner.detail === null ? null : (
              <p className="home-banner-detail">{banner.detail}</p>
            )}
          </div>
          <button
            type="button"
            className="home-banner-dismiss"
            aria-label={`关闭通知：${banner.title}`}
            onClick={() => props.onDismissBanner(banner.id)}
          >
            关闭
          </button>
        </article>
      ))}
    </section>
  );
}

function createBannerClassName(level: UiBanner["level"]): string {
  return `home-banner home-banner-${level}`;
}
