/* IB study notes.
   lower = MYP 1–3 (Grades 6–8), mid = MYP 4–5 (Grades 9–10), upper = Diploma Programme (Grades 11–12) */
const MYP_GRADES=`<h3>How MYP grades work</h3><p>Each subject has four criteria (A–D), each marked 0–8. Your four scores are added (out of 32) and converted to a final grade from 1 to 7. Teachers use the highest band you <i>consistently</i> reach.</p>`;
const CMD=`<h3>Common command terms</h3><ul><li><b>Describe</b>: give a detailed account</li><li><b>Explain</b>: give reasons or causes</li><li><b>Analyse</b>: break down to bring out the essential parts and relationships</li><li><b>Evaluate</b>: weigh strengths and limitations</li><li><b>Discuss</b>: offer a balanced review with a range of arguments</li><li><b>To what extent</b>: consider the merits of an argument and reach a supported judgement</li></ul>`;
window.LIB = {
maths:{color:'#1967d2',
 lower:{
  'Criteria':`${MYP_GRADES}<ul><li><b>A</b> Knowing and understanding</li><li><b>B</b> Investigating patterns: find a rule, test it, then justify or prove it</li><li><b>C</b> Communicating: correct notation, clear steps, diagrams</li><li><b>D</b> Applying mathematics in real-life contexts</li></ul>`,
  'Number & algebra':`<h3>Fractions & percentages</h3><div class="s-q">½ + ⅓ = 3/6 + 2/6 = <b>5/6</b> · 15% of 80 = <b>12</b></div><h3>Equations</h3><div class="s-q">2x + 3 = 11 → 2x = 8 → <b>x = 4</b></div><h3>Patterns (Criterion B)</h3><p>For 3, 7, 11, 15…, the difference is 4, so the nth term is <b>4n − 1</b>. Check it: n = 2 gives 7 ✓</p>`,
  'Practice':`<div class="s-q">1. ¾ − ⅖</div><div class="s-q">2. Solve 5x − 7 = 18</div><div class="s-q">3. nth term of 5, 8, 11, 14…</div><p><i>Answers: 7/20 · x = 5 · 3n + 2</i></p>`},
 mid:{
  'Criteria & eAssessment':`${MYP_GRADES}<p>The MYP 5 on-screen exam is 2 hours, with tasks for all four criteria. Criterion B tasks ask you to find a pattern, describe it as a general rule, then verify and justify it.</p>`,
  'Algebra':`<ul><li>(x + a)(x + b) = x² + (a+b)x + ab</li><li>a² − b² = (a − b)(a + b)</li><li>Quadratic formula: x = (−b ± √(b² − 4ac)) / 2a</li><li>Simultaneous equations: elimination or substitution</li></ul>`,
  'Geometry & trig':`<ul><li>Pythagoras: a² + b² = c²</li><li>SOH CAH TOA</li><li>Sine rule: a/sin A = b/sin B</li><li>Cosine rule: a² = b² + c² − 2bc cos A</li></ul>`,
  'Practice':`<div class="s-q">1. Factorise x² + 7x + 12</div><div class="s-q">2. Solve x² − 5x + 6 = 0</div><div class="s-q">3. Solve 2x + y = 7 and x − y = 2</div><p><i>Answers: (x+3)(x+4) · 2 or 3 · x = 3, y = 1</i></p>`},
 upper:{
  'Course & exams':`<h3>Analysis & Approaches (AA) vs Applications & Interpretation (AI)</h3><p>AA is more algebraic and proof-based. AI focuses on modelling, statistics and technology.</p><ul><li><b>Paper 1</b>: no calculator (AA) / calculator (AI)</li><li><b>Paper 2</b>: calculator allowed</li><li><b>Paper 3</b>: HL only, extended problem-solving</li><li><b>IA (Exploration)</b>: 12–20 pages on a topic you choose, 20% of the grade</li></ul><p>Five topics: Number & algebra, Functions, Geometry & trigonometry, Statistics & probability, Calculus.</p>`,
  'Calculus':`<div class="s-q">d/dx xⁿ = nxⁿ⁻¹ · d/dx eˣ = eˣ · d/dx ln x = 1/x · d/dx sin x = cos x</div><ul><li>Chain rule: dy/dx = dy/du · du/dx</li><li>Product rule: (uv)' = u'v + uv'</li><li>Quotient rule: (u/v)' = (u'v − uv')/v²</li><li>∫ xⁿ dx = xⁿ⁺¹/(n+1) + C</li><li>Area under a curve = ∫ from a to b of f(x) dx</li></ul>`,
  'Stats & probability':`<ul><li>P(A ∪ B) = P(A) + P(B) − P(A ∩ B)</li><li>Conditional: P(A|B) = P(A ∩ B) / P(B)</li><li>Binomial: X ~ B(n, p), E(X) = np</li><li>Normal distribution: use your GDC (normalcdf / invNorm)</li></ul>`,
  'Practice':`<div class="s-q">1. Differentiate (3x² + 1)⁵</div><div class="s-q">2. ∫ from 0 to 2 of (x² + 1) dx</div><div class="s-q">3. X ~ B(10, 0.3). Find E(X).</div><p><i>Answers: 30x(3x² + 1)⁴ · 14/3 · 3</i></p>`}},
english:{color:'#c5221f',
 lower:{
  'Criteria':`${MYP_GRADES}<p>Language & Literature criteria:</p><ul><li><b>A</b> Analysing</li><li><b>B</b> Organizing</li><li><b>C</b> Producing text</li><li><b>D</b> Using language</li></ul>`,
  'Analysis':`<h3>PEEL paragraphs</h3><ul><li><b>P</b>oint · <b>E</b>vidence (short quote) · <b>E</b>xplain the effect · <b>L</b>ink back</li></ul><p>Techniques: simile, metaphor, personification, imagery, tone, structure.</p>`},
 mid:{
  'Criteria & eAssessment':`${MYP_GRADES}<p>The MYP 5 eAssessment is an on-screen exam where you analyse unseen texts (Criterion A), then plan and write a response (B, C and D).</p>${CMD}`,
  'Analysis':`<ul><li>Discuss <b>how</b> the writer creates meaning, not just <b>what</b> happens</li><li>Zoom in on single words and connotations</li><li>Comment on structure: openings, shifts, endings</li><li>Link to context and audience</li></ul>`},
 upper:{
  'DP assessment':`<h3>Language A: Language & Literature / Literature</h3><ul><li><b>Paper 1</b>: guided analysis of unseen text(s). SL does 1 text, HL does 2</li><li><b>Paper 2</b>: comparative essay on 2 works you studied, answering 1 of 4 questions</li><li><b>Individual Oral</b>: 10 minutes + 5 minutes of questions, on how a global issue appears in two texts</li><li><b>HL essay</b>: 1,200–1,500 words</li></ul>`,
  'Paper 1 tips':`<ul><li>Open with a clear thesis that answers the guiding question</li><li>Organise by ideas or effects, not line by line</li><li>Quote briefly and embed quotes in your own sentences</li><li>Name the technique, then explain its effect on the audience</li><li>For non-literary texts, cover layout, images, typography and purpose</li></ul>`,
  'Global issues':`<p>Fields of inquiry for the IO: Culture, identity & community · Beliefs, values & education · Politics, power & justice · Art, creativity & the imagination · Science, technology & the environment.</p>`}},
science:{color:'#188038',
 lower:{
  'Criteria':`${MYP_GRADES}<ul><li><b>A</b> Knowing and understanding</li><li><b>B</b> Inquiring and designing: research question, hypothesis, variables, method</li><li><b>C</b> Processing and evaluating: data, graphs, conclusions, errors</li><li><b>D</b> Reflecting on the impacts of science</li></ul>`,
  'Investigations':`<ul><li>Independent variable: what you change</li><li>Dependent variable: what you measure</li><li>Control variables: what you keep the same, and <b>how</b></li><li>A hypothesis needs a scientific reason: “If… then… because…”</li></ul>`},
 mid:{
  'Criteria':`${MYP_GRADES}<p>Criterion D: discuss how science is applied, its benefits and limitations, and its social, economic, environmental or ethical effects.</p>`,
  'Key ideas':`<h3>Cells</h3><p>Animal cells have a nucleus, cytoplasm, membrane, mitochondria and ribosomes. Plant cells also have a cell wall, chloroplasts and a vacuole.</p><h3>Energy</h3><div class="s-q">KE = ½mv² · GPE = mgh · P = E/t</div><h3>Chemistry</h3><p>acid + base → salt + water</p>`},
 upper:{
  'DP sciences':`<p>In the DP you take Biology, Chemistry, Physics or another science. Name your class after one of those in your timetable to get specific notes.</p><ul><li><b>IA (scientific investigation)</b>: 3,000 words maximum, 20%. Assessed on research design, data analysis, conclusion and evaluation</li><li>The Collaborative Sciences Project is required but not graded</li></ul>`}},
biology:{color:'#188038',
 lower:{'Living things':`<ul><li>Characteristics of life: MRS GREN</li><li>Food chains and webs: producers → consumers</li><li>Cells → tissues → organs → systems</li></ul>`},
 mid:{'Processes':`<div class="s-q">Photosynthesis: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</div><div class="s-q">Aerobic respiration: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O (+ ATP)</div><ul><li>Diffusion, osmosis, active transport</li><li>DNA → mRNA → protein</li></ul>`},
 upper:{
  'DP Biology':`<p>Four themes: <b>Unity and diversity</b> · <b>Form and function</b> · <b>Interaction and interdependence</b> · <b>Continuity and change</b>. Each is studied from molecules to ecosystems.</p><ul><li>Paper 1A multiple choice, Paper 1B data-based questions</li><li>Paper 2: short and extended responses</li></ul>`,
  'Key content':`<ul><li>Enzymes: active site, induced fit, factors affecting rate</li><li>DNA replication is semi-conservative</li><li>Cell respiration: glycolysis → link reaction → Krebs cycle → oxidative phosphorylation</li><li>Natural selection: variation, overproduction, competition, differential survival</li></ul>`}},
chemistry:{color:'#e37400',
 lower:{'Matter':`<ul><li>Elements, compounds and mixtures</li><li>Separation: filtration, evaporation, distillation, chromatography</li></ul>`},
 mid:{'Bonding & reactions':`<ul><li>Ionic: metal + non-metal, electrons transferred</li><li>Covalent: non-metals share electrons</li><li>moles = mass ÷ Mr</li><li>Rate increases with temperature, concentration, surface area and catalysts</li></ul>`},
 upper:{
  'DP Chemistry':`<p>Two strands: <b>Structure</b> (models of particles, bonding, classification of matter) and <b>Reactivity</b> (what drives reactions, how much, how fast, and mechanisms).</p>`,
  'Key equations':`<div class="s-q">n = m/M · pV = nRT · c = n/V · q = mcΔT</div><div class="s-q">ΔG = ΔH − TΔS · pH = −log[H⁺] · Kc = [products]/[reactants]</div><p>Le Chatelier: an equilibrium shifts to oppose a change.</p>`}},
physics:{color:'#7b1fa2',
 lower:{'Forces & energy':`<ul><li>Speed = distance ÷ time</li><li>Balanced forces mean no change in motion</li><li>Energy is conserved; it only changes form</li></ul>`},
 mid:{'Equations':`<div class="s-q">F = ma · W = mg · p = mv · V = IR · P = IV</div><p>Newton's laws: inertia, F = ma, action and reaction.</p>`},
 upper:{
  'DP Physics':`<p>Themes: <b>A</b> Space, time and motion · <b>B</b> The particulate nature of matter · <b>C</b> Wave behaviour · <b>D</b> Fields · <b>E</b> Nuclear and quantum physics.</p>`,
  'Key equations':`<div class="s-q">s = ut + ½at² · v² = u² + 2as · F = Δp/Δt</div><div class="s-q">F = GMm/r² · F = kq₁q₂/r² · E = hf · λ = h/p</div>`}},
history:{color:'#795548',
 lower:{'Criteria':`${MYP_GRADES}<p>Individuals & Societies criteria: <b>A</b> Knowing and understanding · <b>B</b> Investigating · <b>C</b> Communicating · <b>D</b> Thinking critically.</p><p>Source analysis: origin, purpose, value, limitation (OPVL).</p>`},
 mid:{'Skills':`<ul><li>OPVL for every source</li><li>Use specific dates, names and statistics</li><li>Consider multiple perspectives</li></ul>${CMD}`},
 upper:{
  'DP assessment':`<ul><li><b>Paper 1</b>: source-based, on a prescribed subject</li><li><b>Paper 2</b>: two essays on world history topics</li><li><b>Paper 3</b> (HL): three essays on a regional option</li><li><b>IA (Historical investigation)</b>: 2,200 words, with source evaluation, investigation and reflection</li></ul>`,
  'Essay tips':`<ul><li>Answer the exact question and make a judgement in your intro</li><li>Analyse; don't narrate the story</li><li>Bring in historians' interpretations where relevant</li><li>End with a conclusion that weighs the factors</li></ul>`}},
geography:{color:'#00897b',
 lower:{'Skills':`<ul><li>Grid references and scale</li><li>Weather vs climate</li><li>Physical vs human geography</li></ul>`},
 mid:{'Key ideas':`<ul><li>Plate boundaries: constructive, destructive, conservative</li><li>Urbanisation: push and pull factors</li><li>Sustainability: social, economic, environmental</li></ul>`},
 upper:{'DP assessment':`<ul><li><b>Paper 1</b>: geographic themes (options)</li><li><b>Paper 2</b>: core, on population, climate change and resources</li><li><b>Paper 3</b> (HL): global interactions</li><li><b>IA</b>: fieldwork report, 2,500 words</li></ul>`}},
economics:{color:'#2e7d32',
 lower:{'Basics':`<p>Scarcity: unlimited wants, limited resources. Opportunity cost is the next best alternative you give up.</p>`},
 mid:{'Basics':`<ul><li>Demand and supply set the market price</li><li>Price elasticity of demand = %Δ quantity ÷ %Δ price</li></ul>`},
 upper:{
  'DP assessment':`<ul><li><b>Paper 1</b>: extended response</li><li><b>Paper 2</b>: data response</li><li><b>Paper 3</b> (HL): policy paper with calculations</li><li><b>IA</b>: portfolio of 3 commentaries on news articles, up to 800 words each</li></ul><p>Units: Introduction · Microeconomics · Macroeconomics · The global economy.</p>`,
  'Diagrams':`<ul><li>Label axes and curves; show the equilibrium shift with arrows</li><li>Externalities: MSC vs MPC, welfare-loss triangle</li><li>AD/AS: short run vs long run (Keynesian and neoclassical)</li></ul>`}},
business:{color:'#6d4c41',
 upper:{'DP Business Management':`<ul><li><b>Paper 1</b>: pre-released case study</li><li><b>Paper 2</b>: quantitative questions</li><li><b>Paper 3</b> (HL): social enterprise case</li><li><b>IA</b>: business research project on a real organisation</li></ul><p>Tools: SWOT, STEEPLE, Ansoff matrix, decision trees, force-field analysis, break-even.</p>`}},
psychology:{color:'#ad1457',
 upper:{'DP Psychology':`<ul><li>Approaches: biological, cognitive, sociocultural</li><li>Research methods: experiments vs qualitative methods, sampling, ethics</li><li>Every claim needs a named study: aim, method, results, conclusion</li><li><b>IA</b>: replicate a simple experiment</li></ul>`}},
computing:{color:'#3949ab',
 lower:{'Design cycle':`<p>MYP Design criteria: <b>A</b> Inquiring and analysing · <b>B</b> Developing ideas · <b>C</b> Creating the solution · <b>D</b> Evaluating.</p>`},
 mid:{'Programming':`<ul><li>Sequence, selection, iteration</li><li>Binary: 10110101 = 181</li><li>Linear search vs binary search</li></ul>`},
 upper:{'DP Computer Science':`<ul><li>IB pseudocode: loops, arrays, collections (addItem, getNext, hasNext)</li><li>Big-O: binary search O(log n), bubble sort O(n²)</li><li>Data structures: stacks, queues, linked lists, trees</li><li><b>IA</b>: a computational solution for a real client</li></ul>`}},
french:{color:'#1a73e8',
 lower:{'Criteria':`<p>Language Acquisition criteria: <b>A</b> Listening · <b>B</b> Reading · <b>C</b> Speaking · <b>D</b> Writing.</p><div class="s-q">Je m'appelle… · J'ai douze ans · J'habite à…</div>`},
 mid:{'Grammar':`<p>Passé composé: avoir/être + past participle (j'ai mangé, je suis allé(e)). Imparfait is for descriptions and habits.</p>`},
 upper:{'Language B':`<ul><li><b>Paper 1</b>: writing in a text type (blog, email, article…)</li><li><b>Paper 2</b>: listening and reading</li><li><b>Individual Oral</b>: based on a visual stimulus (SL) or literary extract (HL)</li></ul><p>Themes: Identities · Experiences · Human ingenuity · Social organization · Sharing the planet.</p>`}},
spanish:{color:'#f9ab00',
 lower:{'Basics':`<p>Language Acquisition criteria: A Listening · B Reading · C Speaking · D Writing.</p><div class="s-q">Me llamo… · Tengo doce años · Vivo en…</div>`},
 mid:{'Grammar':`<p>Ser vs estar · pretérito vs imperfecto · ir a + infinitive for the future.</p>`},
 upper:{'Language B':`<p>Paper 1 writing, Paper 2 listening and reading, Individual Oral. Themes: Identities · Experiences · Human ingenuity · Social organization · Sharing the planet.</p><p>Subjunctive: ojalá, para que, cuando + future meaning.</p>`}},
tok:{color:'#455a64',
 upper:{'TOK':`<ul><li><b>Exhibition</b>: 3 objects linked to one IA prompt, about 950 words</li><li><b>Essay</b>: 1,600 words on one of six prescribed titles</li><li>Core theme: Knowledge and the knower. Optional themes: technology, language, politics, religion, indigenous societies</li><li>Areas of knowledge: History, Human sciences, Natural sciences, Mathematics, The arts</li><li>Use real-life examples, counterclaims and implications</li></ul>`}},
ee:{color:'#5d4037',
 upper:{'Extended Essay':`<ul><li>Up to 4,000 words of independent research</li><li>About 40 hours, with 3 reflection sessions recorded on the RPPF</li><li>A focused research question is everything</li><li>Combined with TOK, it can earn up to 3 bonus points</li></ul>`}},
cas:{color:'#00838f',
 upper:{'CAS':`<ul><li>Creativity, Activity, Service over about 18 months</li><li>Show evidence of the 7 learning outcomes</li><li>Do at least one CAS project</li><li>Reflect regularly in your portfolio</li></ul>`}}
};
window.libFor=function(sub){const s=String(sub).toLowerCase();const L=window.LIB;
  const k=Object.keys(L).find(k=>new RegExp('\\b'+k).test(s))||(/math|\baa\b|\bai\b|analysis|applications/.test(s)?'maths':/bio/.test(s)?'biology':/chem/.test(s)?'chemistry':/phys/.test(s)?'physics':/comp|ict|\bcs\b|design/.test(s)?'computing':/eng|lit|lang.*lit|language a/.test(s)?'english':/hist/.test(s)?'history':/geo/.test(s)?'geography':/econ/.test(s)?'economics':/business|\bbm\b/.test(s)?'business':/psych/.test(s)?'psychology':/theory of knowledge|\btok\b/.test(s)?'tok':/extended essay/.test(s)?'ee':/i&s|individuals|societies/.test(s)?'history':/sci/.test(s)?'science':/french/.test(s)?'french':/spanish/.test(s)?'spanish':null);
  return k?L[k]:null};
