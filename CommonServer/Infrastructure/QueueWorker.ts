import { Worker } from 'bullmq';
import { RedisHostname, RedisPassword, RedisPort } from '../Config';
import { QueueJob, QueueName } from './Queue';

export default class QueueWorker {
    public static getWorker(
        queueName: QueueName,
        onJobInQueue: (job: QueueJob) => Promise<void>,
        options: { concurrency: number }
    ): Worker {
        return new Worker(queueName, onJobInQueue, {
            connection: {
                host: RedisHostname.toString(),
                port: RedisPort.toNumber(),
                password: RedisPassword
            },
            concurrency: options.concurrency,
        });
    }
}
