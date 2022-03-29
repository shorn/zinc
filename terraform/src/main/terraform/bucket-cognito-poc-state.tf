resource "aws_s3_object" "readme_state_object"{
  bucket = "cognito-poc-state"
  key = "readme.txt"
  content_type = "text/plain"
  metadata = {}
  tags = {}
  content = <<-EOT
    This bucket stores the Terraform state.
    Bucket was created via the createS3StateBucket task.
  EOT
  
}