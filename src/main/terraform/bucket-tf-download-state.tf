resource "aws_s3_bucket_object" "readme"{
  bucket = "cognito-poc-state"
  key = "readme.txt"
  content_type = "text/plain"
  content = <<-EOT
    This bucket stores the Terraform state.
    Bucket was created via the createS3StateBucket task.
  EOT
}