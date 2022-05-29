## AWS infrastructure cost

During development, monthly costs were about 2 cents per month (because of many
read and write calls to S3 during the many deployments) - every thing else
fits easily within the [Always free](https://aws.amazon.com/free) tier.

I haven't done any estimation analysis but I would not be surprised to find
Zinc could support many hundres of users within the free tier (all busily
doing... pretty much nothing).
You'd end up paying a few cents per month for the S3 reads and would
need to bump the max concurrency of the lambdas.

This would change quickly with a real system though.  Lambda and DynamoDB can
get expensive to run when you use them a lot under continuous load.  They only
become a sensible choice again for high-end requirements.

My personal choice of cloud architecture for most systems would be a
container-based backend running on an ASG -> ELB -> EC2 setup backed by an
RDS database. Swap out the EC2 stuff for an AppRunner setup when it becomes
viable.
The API and authorization model is designed for a state-free backend approach,
so the above setup is fairly easy to implement and support.
There'd probably still be a few Lambdas being used for low-volume
integration/glue purposes (which is their sweet-spot, in my opinion).  
Depending on number of users, I'd consider keeping the authentication lambdas
and only porting the ZincApi to the cheaper container solution.  

