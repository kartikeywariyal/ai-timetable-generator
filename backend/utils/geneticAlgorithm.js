/**
 * Genetic Algorithm Timetable Generator
 * Chromosome: array of { day, period, classId, subjectId, teacherId, classroomId }
 */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build required lessons list from classes
function buildLessons(classes) {
  const lessons = [];
  for (const cls of classes) {
    if (!cls.subjects) continue;
    for (const entry of cls.subjects) {
      // Ensure both subject and teacher exist (might be null if deleted)
      if (!entry.subject || !entry.teacher) continue;

      const hours = entry.subject.hoursPerWeek || 3;
      const subjectId = entry.subject._id?.toString() || entry.subject.toString();
      const teacherId = entry.teacher._id?.toString() || entry.teacher.toString();

      for (let h = 0; h < hours; h++) {
        lessons.push({
          classId: cls._id.toString(),
          subjectId,
          teacherId
        });
      }
    }
  }
  return lessons;
}

// Create a random chromosome
function createChromosome(lessons, days, periods, classrooms) {
  return lessons.map(lesson => {
    const day = days[randomInt(0, days.length - 1)];
    const period = periods[randomInt(0, periods.length - 1)];
    const classroom = classrooms[randomInt(0, classrooms.length - 1)];
    return {
      day,
      period: period.periodNumber,
      classId: lesson.classId,
      subjectId: lesson.subjectId,
      teacherId: lesson.teacherId,
      classroomId: classroom._id.toString()
    };
  });
}

// Fitness function — returns 0..1
function fitness(chromosome, teachers) {
  let conflicts = 0;
  const total = chromosome.length;

  // Build lookup maps
  const teacherSlots = {};   // teacherId -> Set of "day-period"
  const classSlots = {};     // classId   -> Set of "day-period"
  const roomSlots = {};      // roomId    -> Set of "day-period"
  const teacherDayCount = {}; // teacherId -> { day -> count }

  for (const gene of chromosome) {
    const slot = `${gene.day}-${gene.period}`;

    // Teacher clash
    if (!teacherSlots[gene.teacherId]) teacherSlots[gene.teacherId] = new Set();
    if (teacherSlots[gene.teacherId].has(slot)) conflicts++;
    else teacherSlots[gene.teacherId].add(slot);

    // Class clash
    if (!classSlots[gene.classId]) classSlots[gene.classId] = new Set();
    if (classSlots[gene.classId].has(slot)) conflicts++;
    else classSlots[gene.classId].add(slot);

    // Room clash
    if (!roomSlots[gene.classroomId]) roomSlots[gene.classroomId] = new Set();
    if (roomSlots[gene.classroomId].has(slot)) conflicts++;
    else roomSlots[gene.classroomId].add(slot);

    // Teacher daily overload
    if (!teacherDayCount[gene.teacherId]) teacherDayCount[gene.teacherId] = {};
    teacherDayCount[gene.teacherId][gene.day] = (teacherDayCount[gene.teacherId][gene.day] || 0) + 1;
  }

  // Teacher availability & max hours per day
  for (const teacher of teachers) {
    const tid = teacher._id.toString();
    const dayMap = teacherDayCount[tid] || {};

    for (const [day, count] of Object.entries(dayMap)) {
      if (count > (teacher.maxHoursPerDay || 6)) conflicts++;
    }

    // Availability check
    if (teacher.availability && teacher.availability.length > 0) {
      const availMap = {};
      for (const av of teacher.availability) availMap[av.day] = new Set(av.periods);

      for (const gene of chromosome) {
        if (gene.teacherId !== tid) continue;
        if (availMap[gene.day] && !availMap[gene.day].has(gene.period)) conflicts++;
      }
    }
  }

  const score = Math.max(0, 1 - conflicts / (total * 2));
  return score;
}

// Tournament selection
function select(population, fitnessScores) {
  const k = 3;
  let best = null;
  for (let i = 0; i < k; i++) {
    const idx = randomInt(0, population.length - 1);
    if (best === null || fitnessScores[idx] > fitnessScores[best]) best = idx;
  }
  return population[best];
}

// Single-point crossover
function crossover(p1, p2, rate) {
  if (Math.random() > rate) return [...p1];
  const point = randomInt(1, p1.length - 1);
  return [...p1.slice(0, point), ...p2.slice(point)];
}

// Mutation: randomly reassign a gene's slot/room
function mutate(chromosome, days, periods, classrooms, rate) {
  return chromosome.map(gene => {
    if (Math.random() < rate) {
      return {
        ...gene,
        day: days[randomInt(0, days.length - 1)],
        period: periods[randomInt(0, periods.length - 1)].periodNumber,
        classroomId: classrooms[randomInt(0, classrooms.length - 1)]._id.toString()
      };
    }
    return gene;
  });
}

function runGA(classes, teachers, classrooms, timeslotConfig, gaParams = {}) {
  const {
    populationSize = 50,
    maxGenerations = 200,
    mutationRate = 0.1,
    crossoverRate = 0.8
  } = gaParams;

  const lessons = buildLessons(classes);
  if (lessons.length === 0) throw new Error('No lessons found to schedule. Please add subjects to your classes.');

  const days = timeslotConfig.days;
  const periods = timeslotConfig.periods.filter(p => !p.isBreak);

  if (!days || days.length === 0) throw new Error('No working days defined in timeslot configuration.');
  if (!periods || periods.length === 0) throw new Error('No active periods (non-breaks) defined in timeslot configuration.');
  if (!classrooms || classrooms.length === 0) throw new Error('No classrooms found. Please add at least one classroom.');
  if (!teachers || teachers.length === 0) throw new Error('No teachers found. Please add at least one teacher.');

  // Initial population
  let population = Array.from({ length: populationSize }, () =>
    createChromosome(lessons, days, periods, classrooms)
  );

  let bestChromosome = null;
  let bestFitness = -1;
  let generation = 0;

  for (let gen = 0; gen < maxGenerations; gen++) {
    const scores = population.map(c => fitness(c, teachers));
    const maxIdx = scores.indexOf(Math.max(...scores));

    if (scores[maxIdx] > bestFitness) {
      bestFitness = scores[maxIdx];
      bestChromosome = population[maxIdx];
    }

    // Early exit if perfect
    if (bestFitness >= 0.999) { generation = gen; break; }

    // Elitism: keep best
    const newPop = [bestChromosome];

    while (newPop.length < populationSize) {
      const p1 = select(population, scores);
      const p2 = select(population, scores);
      let child = crossover(p1, p2, crossoverRate);
      child = mutate(child, days, periods, classrooms, mutationRate);
      newPop.push(child);
    }

    population = newPop;
    generation = gen;
  }

  return { chromosome: bestChromosome, fitnessScore: bestFitness, generation };
}

module.exports = { runGA };
