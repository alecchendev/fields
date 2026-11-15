export const models = [
  ['ElectricDipole', 'Electric dipole', 'electric', 'Two equal, opposite charges. Follow the field lines as they connect the positive and negative sides.'],
  ['LinePositiveCharge', 'Positive line charge', 'electric', 'Explore the radial field surrounding a straight line of positive charge.'],
  ['NegativePointCharge', 'Negative point charge', 'electric', 'A radial field directed inward toward a single negative charge.'],
  ['PlaneNegativeCharge', 'Negative plane charge', 'electric', 'View the field on both sides of a uniformly charged negative plane.'],
  ['PositivePointCharge', 'Positive point charge', 'electric', 'A radial field directed outward from a single positive charge.'],
  ['Sphere', 'Charged sphere', 'electric', 'Inspect the symmetry of the electric field surrounding a charged sphere.'],
  ['BarMagnet', 'Bar magnet', 'magnetic', 'Follow the magnetic field around a bar magnet and through the space between its poles.'],
  ['CurrentLoop', 'Current loop', 'magnetic', 'A loop of current creates a magnetic field that passes through its center and curves around the outside.'],
  ['Horseshoe', 'Horseshoe magnet', 'magnetic', 'Explore the field around a horseshoe magnet, including the gap between its poles.'],
  ['Solenoid', 'Solenoid', 'magnetic', 'See how the magnetic field threads through a coil and returns around its exterior.'],
  ['StraightWire', 'Straight wire', 'magnetic', 'Magnetic field lines circle a straight, current-carrying wire.'],
  ['Torus', 'Toroid', 'magnetic', 'Explore the magnetic field geometry of a ring-shaped coil.'],
].map(([id, name, category, description]) => ({id, name, category, description}));
