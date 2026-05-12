const coverImages = [
  "/images/hero-campus-day-4k.jpg",
  "/images/hero-landscape-day-4k.jpg",
];

const makeWork = (index, overrides = {}) => {
  const rank = String(index).padStart(2, "0");
  return {
    id: `work-${rank}`,
    rank,
    award: "获奖作品",
    title: `获奖作品 ${rank}`,
    author: `作者 / 团队 ${rank}`,
    gitUrl: "https://github.com/",
    cover: coverImages[index % coverImages.length],
    ...overrides,
  };
};

export const hackathonWorks = [
  makeWork(1, {
    award: "冠军作品",
    title: "冠军作品待揭晓",
    author: "冠军作者 / 团队",
  }),
  makeWork(2, {
    award: "亚军作品",
    title: "亚军作品待揭晓",
    author: "亚军作者 / 团队",
  }),
  makeWork(3, {
    award: "季军作品",
    title: "季军作品待揭晓",
    author: "季军作者 / 团队",
  }),
  ...Array.from({ length: 17 }, (_, itemIndex) => makeWork(itemIndex + 4)),
];

export const podiumWorks = hackathonWorks.slice(0, 3);
