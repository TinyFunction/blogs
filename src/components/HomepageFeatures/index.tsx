import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import DiscoveryImg from '@site/static/img/draw_discovery.jpeg';
import ShareImg from '@site/static/img/draw_share.jpeg';
import FunImg from '@site/static/img/draw_fun.jpeg';

type FeatureItem = {
  title: string;
  image: any;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: '勇于探索',
    image: DiscoveryImg,
    description: (
      <>
        我们相信，技术的世界是一片广袤的未知领域，每一行代码都可能打开新的大门。勇于探索不仅是深入学习计算机基础知识的精神，更是敢于尝试、解决未知问题的信念。无论是造轮子的路上遇到的坎坷，还是发现代码中隐藏的可能性，我们都愿意扛起“好奇心”的旗帜，一步步探索计算机科学的精彩奥秘。
      </>
    ),
  },
  {
    title: '乐于分享',
    image: ShareImg,
    description: (
      <>
        知识只有被传递，才能焕发更大的价值。乐于分享是我们 TinyFunction 的核心文化之一——无论是实践中的成功经验还是踩过的坑，我们都愿意记录下来，变成对他人有益的指引。通过写博客、开源项目，甚至是与朋友一起交流，我们希望让技术更有温度，让更多人从中受益。
      </>
    ),
  },
  {
    title: '享受乐趣',
    image: FunImg,
    description: (
      <>
        学习和实践技术并不一定是枯燥的。我们希望将编程变成一件有趣的事，把项目开发当成一场冒险。无论是熬夜调试后成功的那一刻，还是造轮子过程中和伙伴们的欢声笑语，我们都相信乐趣是成长的最佳催化剂。享受过程中的每一秒，是 TinyFunction 永远坚持的态度！
      </>
    ),
  },
];

function Feature({ title, image, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={image} className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
