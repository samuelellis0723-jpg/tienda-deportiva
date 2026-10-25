import { sportsOf } from '../../utils/catalog-taxonomy.js';

export default function SportBadges({ product }) {
  const sports = sportsOf(product);
  return <div className="sport-badges" aria-label="Deporte del producto">
    {sports.length ? sports.map((sport) => <span className="sport-badge" key={sport.slug}>{sport.label}</span>) : <span className="sport-badge unassigned">Deporte por confirmar</span>}
  </div>;
}
