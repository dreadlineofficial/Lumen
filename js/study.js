/* Built-in study notes, split by level.
   lower = Grades 6–8 / Years 7–9, mid = Grades 9–10 / Years 10–11 (GCSE), upper = Grades 11–12 / Years 12–13 (A-level) */
window.LIB = {
maths:{color:'#1967d2',
 lower:{
  'Fractions & percentages':`<h3>Fractions</h3><ul><li>Add/subtract: make the denominators the same first. ½ + ⅓ = 3/6 + 2/6 = <b>5/6</b></li><li>Multiply: top × top, bottom × bottom</li><li>Divide: flip the second fraction and multiply</li></ul><h3>Percentages</h3><div class="s-q">Find 15% of 80 → 10% = 8, 5% = 4 → <b>12</b></div><div class="s-q">Increase 60 by 20% → 60 × 1.2 = <b>72</b></div>`,
  'Algebra basics':`<h3>Simplifying</h3><div class="s-q">3a + 2b − a + 5b = <b>2a + 7b</b></div><h3>Solving one-step & two-step equations</h3><div class="s-q">2x + 3 = 11 → 2x = 8 → <b>x = 4</b></div><h3>Substitution</h3><p>If a = 3, then 4a² = 4 × 9 = 36.</p>`,
  'Practice':`<div class="s-q">1. ¾ − ⅖</div><div class="s-q">2. Find 35% of 240</div><div class="s-q">3. Solve 5x − 7 = 18</div><div class="s-q">4. Area of a rectangle 7 cm × 4.5 cm</div><p><i>Answers: 7/20 · 84 · x = 5 · 31.5 cm²</i></p>`},
 mid:{
  'Algebra':`<h3>Solving linear equations</h3><div class="s-q">3x + 7 = 22 → 3x = 15 → <b>x = 5</b></div><h3>Expanding & factorising</h3><ul><li>(x + a)(x + b) = x² + (a+b)x + ab</li><li>Difference of two squares: a² − b² = (a − b)(a + b)</li></ul><h3>Quadratic formula</h3><div class="s-q">x = (−b ± √(b² − 4ac)) / 2a</div><h3>Simultaneous equations</h3><p>Eliminate one variable by adding/subtracting, or substitute.</p>`,
  'Geometry & trig':`<ul><li>Circle: area πr², circumference 2πr</li><li>Pythagoras: a² + b² = c²</li><li>Angles in a triangle 180°, quadrilateral 360°</li></ul><h3>SOH CAH TOA</h3><div class="s-q">sin θ = O/H · cos θ = A/H · tan θ = O/A</div><h3>Sine & cosine rules</h3><div class="s-q">a/sin A = b/sin B · a² = b² + c² − 2bc cos A</div>`,
  'Practice':`<div class="s-q">1. Factorise x² + 7x + 12</div><div class="s-q">2. Solve x² − 5x + 6 = 0</div><div class="s-q">3. Legs 6 cm and 8 cm: hypotenuse?</div><div class="s-q">4. Solve 2x + y = 7, x − y = 2</div><p><i>Answers: (x+3)(x+4) · x = 2 or 3 · 10 cm · x = 3, y = 1</i></p>`},
 upper:{
  'Differentiation':`<h3>Rules</h3><div class="s-q">d/dx (xⁿ) = nxⁿ⁻¹ · d/dx (eˣ) = eˣ · d/dx (ln x) = 1/x</div><ul><li>Chain rule: dy/dx = dy/du × du/dx</li><li>Product rule: (uv)' = u'v + uv'</li><li>Quotient rule: (u/v)' = (u'v − uv')/v²</li></ul><p>Stationary points: set dy/dx = 0; second derivative &gt; 0 → minimum.</p>`,
  'Integration':`<div class="s-q">∫ xⁿ dx = xⁿ⁺¹/(n+1) + c (n ≠ −1) · ∫ 1/x dx = ln|x| + c</div><ul><li>Area under a curve = definite integral</li><li>By substitution and by parts: ∫ u dv = uv − ∫ v du</li></ul>`,
  'Practice':`<div class="s-q">1. Differentiate (3x² + 1)⁵</div><div class="s-q">2. ∫ from 0 to 2 of (x² + 1) dx</div><div class="s-q">3. Find the stationary point of y = x² − 6x + 2</div><p><i>Answers: 30x(3x²+1)⁴ · 14/3 · (3, −7) minimum</i></p>`}},
english:{color:'#c5221f',
 lower:{
  'Reading':`<h3>PEE paragraphs</h3><ul><li><b>P</b>oint – answer the question</li><li><b>E</b>vidence – a short quote</li><li><b>E</b>xplain – what it shows and why</li></ul><h3>Word classes</h3><p>Noun, verb, adjective, adverb, pronoun, preposition, conjunction.</p>`,
  'Writing':`<ul><li>Use paragraphs: new time, place, topic or speaker</li><li>Vary sentence openings</li><li>Show, don't tell: “her hands shook” instead of “she was scared”</li></ul>`},
 mid:{
  'Language analysis':`<h3>PETAL</h3><ul><li><b>P</b>oint · <b>E</b>vidence · <b>T</b>echnique · <b>A</b>nalysis · <b>L</b>ink</li></ul><h3>Techniques</h3><ul><li>Metaphor, simile, personification</li><li>Sibilance, plosives, onomatopoeia</li><li>Pathetic fallacy, juxtaposition, foreshadowing</li></ul>`,
  'Writing':`<h3>Persuasive (AFOREST)</h3><p>Anecdote, Facts, Opinions, Rhetorical questions, Emotive language, Statistics, Triples.</p><ul><li>Semicolons join two related sentences</li><li>Colons introduce a list or explanation</li><li>Short sentences build tension</li></ul>`},
 upper:{
  'Critical essays':`<ul><li>Build a line of argument, not a list of points</li><li>Embed short quotations in your own sentences</li><li>Use critical views and context (AO3, AO5) to test your argument</li><li>Consider form and structure as well as language</li></ul>`,
  'Key terms':`<p>Bildungsroman, unreliable narrator, free indirect discourse, volta, caesura, enjambment, hamartia, catharsis, anagnorisis.</p>`}},
science:{color:'#188038',
 lower:{
  'Basics':`<h3>Working scientifically</h3><ul><li>Independent variable: what you change</li><li>Dependent variable: what you measure</li><li>Control variables: kept the same</li></ul><h3>States of matter</h3><p>Solid → liquid (melting) → gas (evaporating). Particles gain energy and move further apart.</p><h3>Cells</h3><p>Nucleus, cytoplasm, cell membrane. Plants also have a cell wall, chloroplasts and a vacuole.</p>`},
 mid:{
  'Overview':`<h3>Cells</h3><p>Animal: nucleus, cytoplasm, membrane, mitochondria, ribosomes. Plant: plus cell wall, chloroplasts, permanent vacuole.</p><h3>Energy</h3><div class="s-q">KE = ½mv² · GPE = mgh · Power = energy ÷ time</div><h3>Chemistry</h3><p>Acid + alkali → salt + water. pH below 7 is acidic.</p>`},
 upper:{
  'Overview':`<p>At this level science splits into Biology, Chemistry and Physics. Name your class after one of those in your timetable to get specific notes.</p>`}},
biology:{color:'#188038',
 lower:{'Living things':`<ul><li>MRS GREN: Movement, Respiration, Sensitivity, Growth, Reproduction, Excretion, Nutrition</li><li>Food chains: producer → primary consumer → secondary consumer</li></ul>`},
 mid:{'Cells & processes':`<h3>Photosynthesis</h3><div class="s-q">CO₂ + water → glucose + oxygen (light, chlorophyll)</div><h3>Respiration</h3><div class="s-q">glucose + oxygen → CO₂ + water (+ energy)</div><ul><li>Diffusion: high → low, passive</li><li>Osmosis: water across a partially permeable membrane</li><li>Active transport: low → high, needs energy</li></ul>`},
 upper:{'Biochemistry':`<ul><li>Enzymes: lock-and-key vs induced fit; affected by temperature, pH, substrate concentration</li><li>DNA replication is semi-conservative (Meselson–Stahl)</li><li>Krebs cycle and oxidative phosphorylation produce most ATP</li></ul>`}},
chemistry:{color:'#e37400',
 lower:{'Elements & compounds':`<ul><li>Element: one type of atom</li><li>Compound: two or more elements chemically joined</li><li>Mixture: not chemically joined, can be separated (filtering, distillation)</li></ul>`},
 mid:{'Atoms & bonding':`<ul><li>Proton +1, neutron 0, electron −1</li><li>Ionic: metal + non-metal, electrons transferred</li><li>Covalent: non-metals share electrons</li></ul><div class="s-q">moles = mass ÷ Mr</div>`},
 upper:{'Physical chemistry':`<div class="s-q">pV = nRT · ΔG = ΔH − TΔS · Kc = [products]/[reactants]</div><ul><li>Le Chatelier: equilibrium shifts to oppose a change</li><li>Rate = k[A]^m[B]^n</li></ul>`}},
physics:{color:'#7b1fa2',
 lower:{'Forces':`<ul><li>Forces are measured in newtons (N)</li><li>Balanced forces: no change in motion</li><li>speed = distance ÷ time</li></ul>`},
 mid:{'Forces & electricity':`<div class="s-q">F = ma · W = mg · V = IR · P = IV · Q = It</div><ol><li>Objects stay at rest or constant velocity unless a resultant force acts</li><li>F = ma</li><li>Equal and opposite reactions</li></ol>`},
 upper:{'Mechanics & fields':`<div class="s-q">s = ut + ½at² · v² = u² + 2as · p = mv</div><div class="s-q">F = GMm/r² · F = kQq/r² · E = hf</div>`}},
history:{color:'#795548',
 lower:{'Skills':`<ul><li>Primary sources: from the time. Secondary: made later</li><li>Chronology: put events in order</li><li>Cause and consequence</li></ul>`},
 mid:{'Source skills':`<ul><li><b>N</b>ature, <b>O</b>rigin, <b>P</b>urpose of a source</li><li>Essays: judgement → factors with evidence → counter-argument → conclusion</li></ul>`},
 upper:{'Historiography':`<ul><li>Compare interpretations: who wrote them, when, and why</li><li>Sustain a judgement across the whole essay</li><li>Use precise dates, statistics and names</li></ul>`}},
geography:{color:'#00897b',
 lower:{'Map skills':`<ul><li>Four-figure grid refs: along the corridor, up the stairs</li><li>Compass points and scale</li><li>Weather vs climate</li></ul>`},
 mid:{'Physical':`<ul><li>Constructive, destructive and conservative plate margins</li><li>River erosion: hydraulic action, abrasion, attrition, solution</li></ul>`},
 upper:{'Systems':`<ul><li>Water and carbon cycles as open/closed systems</li><li>Inputs, outputs, stores, flows, feedback loops</li></ul>`}},
computing:{color:'#3949ab',
 lower:{'Basics':`<ul><li>Algorithm: a set of step-by-step instructions</li><li>Input → process → output</li><li>Online safety: strong passwords, don't share personal info</li></ul>`},
 mid:{'Programming':`<ul><li>Sequence, selection, iteration</li><li>Binary 128 64 32 16 8 4 2 1: 10110101 = 181</li><li>Linear search, binary search, bubble sort, merge sort</li></ul>`},
 upper:{'Data structures':`<ul><li>Stacks (LIFO), queues (FIFO), linked lists, trees, graphs, hash tables</li><li>Big-O: binary search O(log n), merge sort O(n log n)</li><li>Recursion needs a base case</li></ul>`}},
french:{color:'#1a73e8',
 lower:{'Basics':`<div class="s-q">Bonjour · Je m'appelle… · J'ai douze ans · J'habite à…</div><p>Le / la / les: masculine / feminine / plural.</p>`},
 mid:{'Grammar':`<div class="s-q">être: je suis, tu es, il est, nous sommes, vous êtes, ils sont</div><p>Passé composé: avoir/être + past participle (j'ai mangé, je suis allé(e)).</p>`},
 upper:{'Advanced grammar':`<ul><li>Subjunctive after il faut que, bien que, pour que</li><li>Pluperfect: j'avais fait</li><li>Conditional perfect: j'aurais fait</li></ul>`}},
spanish:{color:'#f9ab00',
 lower:{'Basics':`<div class="s-q">Hola · Me llamo… · Tengo doce años · Vivo en…</div>`},
 mid:{'Grammar':`<p>Ser: permanent traits. Estar: location, feelings, temporary states.</p><div class="s-q">estoy, estás, está, estamos, estáis, están</div>`},
 upper:{'Advanced grammar':`<ul><li>Subjunctive after cuando (future), ojalá, para que</li><li>Si clauses: si tuviera dinero, viajaría</li></ul>`}}
};
window.libFor=function(sub){const s=String(sub).toLowerCase();const L=window.LIB;
  const k=Object.keys(L).find(k=>s.includes(k))||(/math/.test(s)?'maths':/bio/.test(s)?'biology':/chem/.test(s)?'chemistry':/phys/.test(s)?'physics':/comp|ict|\bcs\b/.test(s)?'computing':/eng|lit/.test(s)?'english':/hist/.test(s)?'history':/geo/.test(s)?'geography':/sci/.test(s)?'science':null);
  return k?L[k]:null};
