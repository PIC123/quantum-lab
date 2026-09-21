// Physical constants and the parameters of the ion the lab models: 40Ca+.
// Every number the physics models need lives here so that no experiment
// hard-codes a constant in its UI layer.

export const HBAR = 1.054571817e-34; // J s
export const KB = 1.380649e-23;      // J / K
export const E_CHARGE = 1.602176634e-19; // C
export const AMU = 1.66053906660e-27; // kg

/** 40Ca+, the species the existing TIQC Lab diagram describes. */
export const CA40 = {
  name: '40Ca+',
  mass: 39.9626 * AMU,
  /** S1/2 -> P1/2 cooling and detection transition. */
  cooling: {
    wavelength: 396.85e-9,          // m
    gamma: 2 * Math.PI * 21.6e6,    // rad/s, natural linewidth of the P1/2 level
  },
  /** S1/2 -> D5/2 quadrupole transition used as the optical qubit. */
  qubit: {
    wavelength: 729.15e-9,          // m
    lifetime: 1.17,                 // s, D5/2 lifetime (sets the ultimate T1)
  },
  repump: { wavelength: 866.21e-9 },
  photoionization: { wavelengths: [422.8e-9, 375e-9] },
};

/** Wavenumber of the cooling light. */
export const K_COOL = 2 * Math.PI / CA40.cooling.wavelength;

/** Doppler limit for 40Ca+ on the 397 nm transition, about 0.5 mK. */
export const DOPPLER_LIMIT_K = HBAR * CA40.cooling.gamma / (2 * KB);

/** Recoil energy of one 397 nm photon, in joules. */
export const RECOIL_ENERGY_J = (HBAR * K_COOL) ** 2 / (2 * CA40.mass);
