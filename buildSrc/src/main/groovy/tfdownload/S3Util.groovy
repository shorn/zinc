package tfdownload

import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider
import software.amazon.awssdk.profiles.ProfileFile
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.*

import java.nio.file.Files
import java.nio.file.Path

import static software.amazon.awssdk.profiles.ProfileFile.Type.CREDENTIALS
import static software.amazon.awssdk.services.s3.model.BucketVersioningStatus.ENABLED

class S3Util{
  static Path credPath

  static S3Client s3Client(){
    def builder = S3Client.builder()

    if( credPath && Files.exists(credPath) ){
      builder.credentialsProvider(DefaultCredentialsProvider.builder().
        profileFile(ProfileFile.builder().
          content(credPath).type(CREDENTIALS).build()).build())
    }

    builder.region(Region.AP_SOUTHEAST_2)
    return builder.build()
  }

  static Bucket createPrivateVersionedBucket(String bucketName){
    def s3 = s3Client()

    if( getBucket(bucketName) ){
      println "bucket already exists: $bucketName"
      return getBucket(bucketName)
    }

    S3Request req = CreateBucketRequest.builder().
      bucket(bucketName).
      objectOwnership(ObjectOwnership.BUCKET_OWNER_ENFORCED).
      acl(BucketCannedACL.PRIVATE).
      build()

    println "creating bucket: $bucketName"
    s3.createBucket(req)
    
    println "waiting for bucket to exist"
    s3.waiter().waitUntilBucketExists(
      HeadBucketRequest.builder().bucket(bucketName).build() )

    println "enabling bucket versioning"
    s3.putBucketVersioning(
      PutBucketVersioningRequest.builder().
        bucket(bucketName).
        versioningConfiguration(
          VersioningConfiguration.builder().status(ENABLED).build()
        ).build() 
    )

    println "blocking public ACLs"
    s3.putPublicAccessBlock(
      PutPublicAccessBlockRequest.builder().
        bucket(bucketName).
        publicAccessBlockConfiguration(
          PublicAccessBlockConfiguration.builder().
            blockPublicAcls(true).
            blockPublicPolicy(true).
            ignorePublicAcls(true).
            build()
        ).build() 
    )
    
    def bucket = getBucket(bucketName)
    println "finished creating bucket: ${bucket.name()}"
    return bucket
  }

  static Bucket getBucket(String bucketName){
    return s3Client().listBuckets().buckets().find{ it.name() == bucketName }
  }
}
