import { interpolateRgbBasis } from "d3";

const Archambault = [
  "#88a0dc",
  "#381a61",
  "#7c4b73",
  "#ed968c",
  "#ab3329",
  "#e78429",
  "#f9d14a",
];
const Austria = [
  "#a40000",
  "#16317d",
  "#007e2f",
  "#ffcd12",
  "#b86092",
  "#721b3e",
  "#00b7a7",
];
const Benedictus = [
  "#9a133d",
  "#b93961",
  "#d8527c",
  "#f28aaa",
  "#f9b4c9",
  "#f9e0e8",
  "#ffffff",
  "#eaf3ff",
  "#c5daf6",
  "#a1c2ed",
  "#6996e3",
  "#4060c8",
  "#1a318b",
];
const Cassatt1 = [
  "#b1615c",
  "#d88782",
  "#e3aba7",
  "#edd7d9",
  "#c9c9dd",
  "#9d9dc7",
  "#8282aa",
  "#5a5a83",
];
const Cassatt2 = [
  "#2d223c",
  "#574571",
  "#90719f",
  "#b695bc",
  "#dec5da",
  "#c1d1aa",
  "#7fa074",
  "#466c4b",
  "#2c4b27",
  "#0e2810",
];
const Cross = [
  "#c969a1",
  "#ce4441",
  "#ee8577",
  "#eb7926",
  "#ffbb44",
  "#859b6c",
  "#62929a",
  "#004f63",
  "#122451",
];
const Degas = [
  "#591d06",
  "#96410e",
  "#e5a335",
  "#556219",
  "#418979",
  "#2b614e",
  "#053c29",
];
const Demuth = [
  "#591c19",
  "#9b332b",
  "#b64f32",
  "#d39a2d",
  "#f7c267",
  "#b9b9b8",
  "#8b8b99",
  "#5d6174",
  "#41485f",
  "#262d42",
];
const Derain = [
  "#efc86e",
  "#97c684",
  "#6f9969",
  "#aab5d5",
  "#808fe1",
  "#5c66a8",
  "#454a74",
];
const Egypt = ["#dd5129", "#0f7ba2", "#43b284", "#fab255"];
const Gauguin = [
  "#b04948",
  "#811e18",
  "#9e4013",
  "#c88a2c",
  "#4c6216",
  "#1a472a",
];
const Greek = ["#3c0d03", "#8d1c06", "#e67424", "#ed9b49", "#f5c34d"];
const Hiroshige = [
  "#e76254",
  "#ef8a47",
  "#f7aa58",
  "#ffd06f",
  "#ffe6b7",
  "#aadce0",
  "#72bcd5",
  "#528fad",
  "#376795",
  "#1e466e",
];
const Hokusai1 = [
  "#6d2f20",
  "#b75347",
  "#df7e66",
  "#e09351",
  "#edc775",
  "#94b594",
  "#224b5e",
];
const Hokusai2 = [
  "#abc9c8",
  "#72aeb6",
  "#4692b0",
  "#2f70a1",
  "#134b73",
  "#0a3351",
];
const Hokusai3 = [
  "#d8d97a",
  "#95c36e",
  "#74c8c3",
  "#5a97c1",
  "#295384",
  "#0a2e57",
];
const Homer1 = [
  "#551f00",
  "#a62f00",
  "#df7700",
  "#f5b642",
  "#fff179",
  "#c3f4f6",
  "#6ad5e8",
  "#32b2da",
];
const Homer2 = [
  "#bf3626",
  "#e9851d",
  "#f9c53b",
  "#aeac4c",
  "#788f33",
  "#165d43",
];
const Ingres = [
  "#041d2c",
  "#06314e",
  "#18527e",
  "#2e77ab",
  "#d1b252",
  "#a97f2f",
  "#7e5522",
  "#472c0b",
];
const Isfahan1 = [
  "#4e3910",
  "#845d29",
  "#ae8548",
  "#e3c28b",
  "#4fb6ca",
  "#178f92",
  "#175f5d",
  "#054544",
];
const Isfahan2 = ["#d7aca1", "#ddc000", "#79ad41", "#34b6c6", "#4063a3"];
const Java = ["#663171", "#cf3a36", "#ea7428", "#e2998a", "#0c7156"];
const Johnson = ["#a00e00", "#d04e00", "#f6c200", "#0086a8", "#132b69"];
const Juarez = [
  "#a82203",
  "#208cc0",
  "#f1af3a",
  "#cf5e4e",
  "#637b31",
  "#003967",
];
const Kandinsky = ["#3b7c70", "#ce9642", "#898e9f", "#3b3a3e"];
const Klimt = [
  "#df9ed4",
  "#c93f55",
  "#eacc62",
  "#469d76",
  "#3c4b99",
  "#924099",
];
const Lakota = [
  "#04a3bd",
  "#f0be3d",
  "#931e18",
  "#da7901",
  "#247d3f",
  "#20235b",
];
const Manet = [
  "#3b2319",
  "#80521c",
  "#d29c44",
  "#ebc174",
  "#ede2cc",
  "#7ec5f4",
  "#4585b7",
  "#225e92",
  "#183571",
  "#43429b",
  "#5e65be",
];
const Monet = [
  "#4e6d58",
  "#749e89",
  "#abccbe",
  "#e3cacf",
  "#c399a2",
  "#9f6e71",
  "#41507b",
  "#7d87b2",
  "#c2cae3",
];
const Moreau = [
  "#421600",
  "#792504",
  "#bc7524",
  "#8dadca",
  "#527baa",
  "#104839",
  "#082844",
];
const Morgenstern = [
  "#98768e",
  "#b08ba5",
  "#c7a2b6",
  "#dfbbc8",
  "#ffc680",
  "#ffb178",
  "#db8872",
  "#a56457",
];
const Nattier = [
  "#52271c",
  "#944839",
  "#c08e39",
  "#7f793c",
  "#565c33",
  "#184948",
  "#022a2a",
];
const Navajo = ["#660d20", "#e59a52", "#edce79", "#094568", "#e1c59a"];
const NewKingdom = ["#e1846c", "#9eb4e0", "#e6bb9e", "#9c6849", "#735852"];
const Nizami = [
  "#dd7867",
  "#b83326",
  "#c8570d",
  "#edb144",
  "#8cc8bc",
  "#7da7ea",
  "#5773c0",
  "#1d4497",
];
const OKeeffe1 = [
  "#6b200c",
  "#973d21",
  "#da6c42",
  "#ee956a",
  "#fbc2a9",
  "#f6f2ee",
  "#bad6f9",
  "#7db0ea",
  "#447fdd",
  "#225bb2",
  "#133e7e",
];
const OKeeffe2 = [
  "#fbe3c2",
  "#f2c88f",
  "#ecb27d",
  "#e69c6b",
  "#d37750",
  "#b9563f",
  "#92351e",
];
const Paquin = [
  "#831818",
  "#c62320",
  "#f05b43",
  "#f78462",
  "#feac81",
  "#f7dea3",
  "#ced1af",
  "#98ab76",
  "#748f46",
  "#47632a",
  "#275024",
];
const Peru1 = [
  "#b5361c",
  "#e35e28",
  "#1c9d7c",
  "#31c7ba",
  "#369cc9",
  "#3a507f",
];
const Peru2 = [
  "#65150b",
  "#961f1f",
  "#c0431f",
  "#f19425",
  "#c59349",
  "#533d14",
];
const Pillement = [
  "#a9845b",
  "#697852",
  "#738e8e",
  "#44636f",
  "#2b4655",
  "#0f252f",
];
const Pissaro = [
  "#134130",
  "#4c825d",
  "#8cae9e",
  "#8dc7dc",
  "#508ca7",
  "#1a5270",
  "#0e2a4d",
];
const Redon = [
  "#5b859e",
  "#1e395f",
  "#75884b",
  "#1e5a46",
  "#df8d71",
  "#af4f2f",
  "#d48f90",
  "#732f30",
  "#ab84a5",
  "#59385c",
  "#d8b847",
  "#b38711",
];
const Renoir = [
  "#17154f",
  "#2f357c",
  "#6c5d9e",
  "#9d9cd5",
  "#b0799a",
  "#f6b3b0",
  "#e48171",
  "#bf3729",
  "#e69b00",
  "#f5bb50",
  "#ada43b",
  "#355828",
];
const Signac = [
  "#fbe183",
  "#f4c40f",
  "#fe9b00",
  "#d8443c",
  "#9b3441",
  "#de597c",
  "#e87b89",
  "#e6a2a6",
  "#aa7aa1",
  "#9f5691",
  "#633372",
  "#1f6e9c",
  "#2b9b81",
  "#92c051",
];
const Tam = [
  "#ffd353",
  "#ffb242",
  "#ef8737",
  "#de4f33",
  "#bb292c",
  "#9f2d55",
  "#62205f",
  "#341648",
];
const Tara = ["#eab1c6", "#d35e17", "#e18a1f", "#e9b109", "#829d44"];
const Thomas = [
  "#b24422",
  "#c44d76",
  "#4457a5",
  "#13315f",
  "#b1a1cc",
  "#59386c",
  "#447861",
  "#7caf5c",
];
const Tiepolo = [
  "#802417",
  "#c06636",
  "#ce9344",
  "#e8b960",
  "#646e3b",
  "#2b5851",
  "#508ea2",
  "#17486f",
];
const Troy = [
  "#421401",
  "#6c1d0e",
  "#8b3a2b",
  "#c27668",
  "#7ba0b4",
  "#44728c",
  "#235070",
  "#0a2d46",
];
const Tsimshian = [
  "#582310",
  "#aa361d",
  "#82c45f",
  "#318f49",
  "#0cb4bb",
  "#2673a3",
  "#473d7d",
];
const VanGogh1 = [
  "#2c2d54",
  "#434475",
  "#6b6ca3",
  "#969bc7",
  "#87bcbd",
  "#89ab7c",
  "#6f9954",
];
const VanGogh2 = [
  "#bd3106",
  "#d9700e",
  "#e9a00e",
  "#eebe04",
  "#5b7314",
  "#c3d6ce",
  "#89a6bb",
  "#454b87",
];
const VanGogh3 = [
  "#e7e5cc",
  "#c2d6a4",
  "#9cc184",
  "#669d62",
  "#3c7c3d",
  "#1f5b25",
  "#1e3d14",
  "#192813",
];
const Veronese = [
  "#67322e",
  "#99610a",
  "#c38f16",
  "#6e948c",
  "#2c6b67",
  "#175449",
  "#122c43",
];
const Wissing = ["#4b1d0d", "#7c291e", "#ba7233", "#3a4421", "#2d5380"];

export const interpolateArchambault = interpolateRgbBasis(Archambault);
export const interpolateAustria = interpolateRgbBasis(Austria);
export const interpolateBenedictus = interpolateRgbBasis(Benedictus);
export const interpolateCassatt1 = interpolateRgbBasis(Cassatt1);
export const interpolateCassatt2 = interpolateRgbBasis(Cassatt2);
export const interpolateCross = interpolateRgbBasis(Cross);
export const interpolateDegas = interpolateRgbBasis(Degas);
export const interpolateDemuth = interpolateRgbBasis(Demuth);
export const interpolateDerain = interpolateRgbBasis(Derain);
export const interpolateEgypt = interpolateRgbBasis(Egypt);
export const interpolateGauguin = interpolateRgbBasis(Gauguin);
export const interpolateGreek = interpolateRgbBasis(Greek);
export const interpolateHiroshige = interpolateRgbBasis(Hiroshige);
export const interpolateHokusai1 = interpolateRgbBasis(Hokusai1);
export const interpolateHokusai2 = interpolateRgbBasis(Hokusai2);
export const interpolateHokusai3 = interpolateRgbBasis(Hokusai3);
export const interpolateHomer1 = interpolateRgbBasis(Homer1);
export const interpolateHomer2 = interpolateRgbBasis(Homer2);
export const interpolateIngres = interpolateRgbBasis(Ingres);
export const interpolateIsfahan1 = interpolateRgbBasis(Isfahan1);
export const interpolateIsfahan2 = interpolateRgbBasis(Isfahan2);
export const interpolateJava = interpolateRgbBasis(Java);
export const interpolateJohnson = interpolateRgbBasis(Johnson);
export const interpolateJuarez = interpolateRgbBasis(Juarez);
export const interpolateKandinsky = interpolateRgbBasis(Kandinsky);
export const interpolateKlimt = interpolateRgbBasis(Klimt);
export const interpolateLakota = interpolateRgbBasis(Lakota);
export const interpolateManet = interpolateRgbBasis(Manet);
export const interpolateMonet = interpolateRgbBasis(Monet);
export const interpolateMoreau = interpolateRgbBasis(Moreau);
export const interpolateMorgenstern = interpolateRgbBasis(Morgenstern);
export const interpolateNattier = interpolateRgbBasis(Nattier);
export const interpolateNavajo = interpolateRgbBasis(Navajo);
export const interpolateNewKingdom = interpolateRgbBasis(NewKingdom);
export const interpolateNizami = interpolateRgbBasis(Nizami);
export const interpolateOKeeffe1 = interpolateRgbBasis(OKeeffe1);
export const interpolateOKeeffe2 = interpolateRgbBasis(OKeeffe2);
export const interpolatePaquin = interpolateRgbBasis(Paquin);
export const interpolatePeru1 = interpolateRgbBasis(Peru1);
export const interpolatePeru2 = interpolateRgbBasis(Peru2);
export const interpolatePillement = interpolateRgbBasis(Pillement);
export const interpolatePissaro = interpolateRgbBasis(Pissaro);
export const interpolateRedon = interpolateRgbBasis(Redon);
export const interpolateRenoir = interpolateRgbBasis(Renoir);
export const interpolateSignac = interpolateRgbBasis(Signac);
export const interpolateTam = interpolateRgbBasis(Tam);
export const interpolateTara = interpolateRgbBasis(Tara);
export const interpolateThomas = interpolateRgbBasis(Thomas);
export const interpolateTiepolo = interpolateRgbBasis(Tiepolo);
export const interpolateTroy = interpolateRgbBasis(Troy);
export const interpolateTsimshian = interpolateRgbBasis(Tsimshian);
export const interpolateVanGogh1 = interpolateRgbBasis(VanGogh1);
export const interpolateVanGogh2 = interpolateRgbBasis(VanGogh2);
export const interpolateVanGogh3 = interpolateRgbBasis(VanGogh3);
export const interpolateVeronese = interpolateRgbBasis(Veronese);
export const interpolateWissing = interpolateRgbBasis(Wissing);
