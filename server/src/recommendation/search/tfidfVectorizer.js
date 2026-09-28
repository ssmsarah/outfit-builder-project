// TF-IDF Vectorizer (S6.5), implemented from scratch (no search/ML library):
//
//   tf(t, d)  = 1 + ln(count(t, d))   if count > 0, else 0     (sublinear TF)
//   idf(t)    = ln((1 + N) / (1 + df(t))) + 1                  (smoothed IDF)
//   w(t, d)   = tf(t, d) * idf(t)
//   vector(d) = w(., d) / ||w(., d)||_2                         (L2 normalized)
//
// N = number of documents, df(t) = number of documents containing t.
// Vectors are sparse Maps term -> weight.
//
// A "vector space" keeps the *raw* counts and document frequencies, and
// recomputes IDF and document vectors lazily (only when something changed
// since the last read). That is what lets S6.9 add/update/remove single
// documents without rebuilding everything by hand. One space is built per
// token stream: words and char n-grams (S6.4).

export function termCounts(tokens) {
  const counts = new Map();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

export function tf(count) {
  return count > 0 ? 1 + Math.log(count) : 0;
}

export function idf(df, n) {
  return Math.log((1 + n) / (1 + df)) + 1;
}

export function l2Norm(vector) {
  let sum = 0;
  for (const weight of vector.values()) sum += weight * weight;
  return Math.sqrt(sum);
}

// counts: Map term -> count. Terms without an IDF (not in the vocabulary)
// are ignored, which is how query terms unseen in the corpus drop out.
export function weightVector(counts, idfByTerm) {
  const vector = new Map();

  for (const [term, count] of counts) {
    const termIdf = idfByTerm.get(term);
    if (termIdf === undefined) continue;
    const weight = tf(count) * termIdf;
    if (weight > 0) vector.set(term, weight);
  }

  const norm = l2Norm(vector);
  if (norm === 0) return new Map();

  for (const [term, weight] of vector) vector.set(term, weight / norm);
  return vector;
}

export function createVectorSpace() {
  return {
    counts: new Map(), // docId -> Map term -> count
    df: new Map(), // term -> number of documents containing it
    idf: new Map(), // term -> idf (derived)
    vectors: new Map(), // docId -> normalized vector (derived)
    dirty: false,
    version: 0, // bumped on every refresh, so derived caches know to rebuild
  };
}

export function removeDocument(space, id) {
  const counts = space.counts.get(id);
  if (!counts) return false;

  for (const term of counts.keys()) {
    const df = space.df.get(term) - 1;
    if (df === 0) space.df.delete(term);
    else space.df.set(term, df);
  }

  space.counts.delete(id);
  space.dirty = true;
  return true;
}

// Adds a document, replacing any previous version with the same id.
export function addDocument(space, id, tokens) {
  removeDocument(space, id);

  const counts = termCounts(tokens);
  space.counts.set(id, counts);
  for (const term of counts.keys()) {
    space.df.set(term, (space.df.get(term) ?? 0) + 1);
  }

  space.dirty = true;
}

// Recomputes IDF and every document vector if anything changed. N changes
// with every add/remove, and IDF depends on N, so all vectors are rebuilt.
export function refreshWeights(space) {
  if (!space.dirty) return space;

  const n = space.counts.size;
  space.idf = new Map();
  for (const [term, df] of space.df) {
    space.idf.set(term, idf(df, n));
  }

  space.vectors = new Map();
  for (const [id, counts] of space.counts) {
    space.vectors.set(id, weightVector(counts, space.idf));
  }

  space.dirty = false;
  space.version += 1;
  return space;
}

// docs: [{ id, tokens }]
export function buildVectorSpace(docs) {
  const space = createVectorSpace();
  for (const { id, tokens } of docs) addDocument(space, id, tokens);
  return refreshWeights(space);
}

export function documentVector(space, id) {
  return refreshWeights(space).vectors.get(id) ?? new Map();
}

// A query is vectorized with the corpus IDF.
export function vectorizeQuery(space, tokens) {
  return weightVector(termCounts(tokens), refreshWeights(space).idf);
}
