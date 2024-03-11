import * as O from 'fp-ts/lib/Option';

import { RequestError, RequestResponse } from './appmaker-network-actions';

export type ReplJob = {
  scriptName: string; run: () => Promise<O.Option<RequestResponse | RequestError>>;
};

class ReplScheduler {
  private jobs: Array<ReplJob>;
  currentJob: ReplJob | null;

  constructor () {
    this.jobs = [];
    this.currentJob = null;
  }

  getJobs() {
    return this.jobs;
  }

  getJobsCount() {
    return this.jobs.length + (this.currentJob !== null ? 1 : 0);
  }

  schedule(job: ReplJob): Promise<O.Option<RequestResponse | RequestError>> {
    if (this.currentJob === null) {
      this.currentJob = job;

      return job.run()
        .then((r) => {
          this.currentJob = null;

          if (this.jobs.length !== 0) {
            const newJob = this.jobs[0]!;

            this.schedule(newJob);

            this.jobs = this.jobs.slice(1);
          }

          return r;
        });
    }

    this.jobs = this.jobs.filter(j => j.scriptName !== job.scriptName);
    const newJob = { ...job };
    const pr = new Promise<O.Option<RequestResponse | RequestError>>((resolve, reject) => newJob.run = () => job.run()
      .then(r => { this.currentJob = null; return r; })
      .then(r => { resolve(r); return r; }).catch(r => { reject(r); return r;})
    );
    this.jobs = this.jobs.concat([newJob]);

    return pr;
  }
}

export const replScheduler = new ReplScheduler();
